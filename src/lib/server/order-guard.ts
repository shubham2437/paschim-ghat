import 'server-only';
import { NextResponse } from 'next/server';
import { isTrustedOrigin } from '@/lib/server/origin-guard';
import { clientKeyFromHeaders, orderRateLimit } from '@/lib/server/rate-limit';

type Guarded =
  | { ok: true; body: unknown; ip: string }
  | { ok: false; response: NextResponse };

/**
 * Common front door for order POST endpoints: same-origin check, per-IP rate
 * limit (5/min), body-size cap and JSON parsing. Schema validation and the
 * Turnstile check run afterwards in the route.
 */
export async function guardOrderRequest(request: Request, name: string, maxBytes: number): Promise<Guarded> {
  const fail = (error: string, status: number): Guarded => ({
    ok: false,
    response: NextResponse.json({ error }, { status }),
  });

  if (!isTrustedOrigin(request)) return fail('Origin not allowed', 403);

  const ip = clientKeyFromHeaders(request.headers);
  if (!(await orderRateLimit(name, ip))) {
    return fail('Too many requests, try again shortly', 429);
  }

  // Content-Length can be absent/lied about, so cap the real body too.
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > maxBytes) return fail('Payload too large', 413);
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return fail('Malformed request body', 400);
  }
  if (raw.length > maxBytes) return fail('Payload too large', 413);

  try {
    return { ok: true, body: JSON.parse(raw), ip };
  } catch {
    return fail('Malformed JSON body', 400);
  }
}
