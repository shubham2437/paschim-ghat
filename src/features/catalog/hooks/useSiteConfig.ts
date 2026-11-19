'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SiteConfig } from '@/types/site-content';

interface SiteConfigState {
  data: SiteConfig | null;
  loading: boolean;
  error: string | null;
}

// See useCatalogData.ts for why this lives on globalThis rather than a
// plain module-level variable (Fast Refresh safety in dev).
const g = globalThis as unknown as {
  __siteConfigCache?: SiteConfig;
  __siteConfigInFlight?: Promise<SiteConfig>;
};

const FETCH_TIMEOUT_MS = 10_000;

/** Seeds the cache with data already fetched server-side (e.g. in a Server
 * Component), so the first client render skips the network round-trip. */
export function seedSiteConfig(initial: SiteConfig): void {
  if (!g.__siteConfigCache) g.__siteConfigCache = initial;
}

function fetchSiteConfig(): Promise<SiteConfig> {
  if (g.__siteConfigCache) return Promise.resolve(g.__siteConfigCache);
  if (!g.__siteConfigInFlight) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    g.__siteConfigInFlight = fetch('/api/site-config', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load site configuration (${res.status})`);
        return res.json() as Promise<SiteConfig>;
      })
      .then((json) => {
        g.__siteConfigCache = json;
        g.__siteConfigInFlight = undefined;
        return json;
      })
      .catch((err) => {
        g.__siteConfigInFlight = undefined;
        throw err instanceof Error && err.name === 'AbortError'
          ? new Error('Site configuration request timed out')
          : err;
      })
      .finally(() => clearTimeout(timer));
  }
  return g.__siteConfigInFlight;
}

/** Fetches Settings/Rails/Hampers/Origins/Coupons/Reviews/Journal/Offers —
 * everything sourced from the catalogue workbook besides the product list
 * itself — once, and caches it for the page lifetime. Multiple components
 * mounting at once share a single in-flight request. Call `retry()` to
 * re-fetch after an error. */
export function useSiteConfig(): SiteConfigState & { retry: () => void } {
  const [state, setState] = useState<SiteConfigState>({
    data: g.__siteConfigCache ?? null,
    loading: !g.__siteConfigCache,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (g.__siteConfigCache) {
      setState({ data: g.__siteConfigCache, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchSiteConfig()
      .then((json) => {
        if (!cancelled) setState({ data: json, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
