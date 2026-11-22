import 'server-only';

/**
 * Server-side check of a Cloudflare Turnstile token.
 *
 * Every order form sends the token the Turnstile widget produced; this asks
 * Cloudflare whether it is genuine, unexpired and unused. Tokens are single
 * use and valid for 5 minutes, so the client resets the widget after each
 * submit.
 *
 * If TURNSTILE_SECRET_KEY isn't set yet, verification is skipped (and a
 * warning logged) so ordering keeps working until the keys are configured.
 * Once the secret is set, missing or invalid tokens are rejected, and so is
 * any failure to reach Cloudflare (fail closed).
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5_000;

export type TurnstileResult = { ok: true; skipped?: boolean } | { ok: false; reason: string };

let warnedMissingSecret = false;

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token: string | undefined, remoteIp?: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (!warnedMissingSecret) {
      warnedMissingSecret = true;
      console.warn('[turnstile] TURNSTILE_SECRET_KEY is not set — bot check is DISABLED.');
    }
    return { ok: true, skipped: true };
  }

  if (!token || token.length > 2048) {
    return { ok: false, reason: 'missing-token' };
  }

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  if (remoteIp && remoteIp !== 'anonymous') form.set('remoteip', remoteIp);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, reason: `verify-http-${res.status}` };
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success) return { ok: true };
    return { ok: false, reason: (data['error-codes'] ?? []).join(',') || 'invalid-token' };
  } catch {
    return { ok: false, reason: 'verify-unreachable' };
  } finally {
    clearTimeout(timer);
  }
}
