'use client';

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Turnstile failed to load'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

const SiteKeyContext = createContext<string>('');

/** Supplies the (public) site key, read from the server at request time by
 * the root layout, so it works as a plain runtime Worker variable. */
export function TurnstileProvider({ siteKey, children }: { siteKey: string; children: ReactNode }) {
  return <SiteKeyContext.Provider value={siteKey}>{children}</SiteKeyContext.Provider>;
}

/** True when a Turnstile site key is configured. */
export function useTurnstileEnabled(): boolean {
  return Boolean(useContext(SiteKeyContext));
}

/**
 * Cloudflare Turnstile widget in "interaction-only" mode: invisible unless
 * Cloudflare needs the visitor to do something. Calls `onToken` with a fresh
 * token (or '' when it expires/errors). Change `resetKey` to get a new token
 * after a submit — tokens are single-use.
 */
export function Turnstile({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const SITE_KEY = useContext(SiteKeyContext);
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          appearance: 'interaction-only',
          callback: (t: string) => cb.current(t),
          'expired-callback': () => cb.current(''),
          'error-callback': () => cb.current(''),
        });
      })
      .catch(() => cb.current(''));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [SITE_KEY]);

  useEffect(() => {
    if (resetKey > 0 && widgetId.current && window.turnstile) {
      cb.current('');
      window.turnstile.reset(widgetId.current);
    }
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={ref} />;
}
