import 'server-only';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Verifies a Cloudflare Turnstile token server-side. The browser's token is
 * never trusted on its own: it is checked against Cloudflare's siteverify
 * endpoint with the secret key (single-use, expires after ~5 minutes).
 *
 * If TURNSTILE_SECRET_KEY is not set the check is skipped (logged once) so
 * the site keeps working until the keys are added. Set it in production.
 */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    warnOnce();
    return { ok: true };
  }
  if (!token || token.length > 2048) {
    return { ok: false, status: 400, error: 'Please complete the security check and try again' };
  }

  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'anonymous') form.set('remoteip', ip);
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(8_000),
    });
    const data = (await res.json()) as { success?: boolean };
    if (data.success === true) return { ok: true };
    return { ok: false, status: 403, error: 'Security check failed — please try again' };
  } catch {
    // Fail closed: if we cannot verify, we do not accept the order.
    return { ok: false, status: 503, error: 'Could not verify the security check — please try again' };
  }
}

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn('[turnstile] TURNSTILE_SECRET_KEY is not set — order requests are NOT bot-checked.');
}
