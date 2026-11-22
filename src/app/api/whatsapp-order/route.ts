import { NextResponse } from 'next/server';
import { whatsappOrderSchema } from '@/lib/validation/schemas';
import { clientKeyFromHeaders, edgeRateLimit } from '@/lib/server/rate-limit';
import { verifyTurnstile } from '@/lib/server/turnstile';
import { isTrustedOrigin } from '@/lib/server/origin-guard';
import { getSiteConfig } from '@/data/site-content.server';
import { buildWaUrl } from '@/lib/server/whatsapp';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4_000;

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }

  // 5 requests per minute per IP, counted across all of Cloudflare's network
  // (ORDER_RATE_LIMITER in wrangler.jsonc).
  const key = clientKeyFromHeaders(request.headers);
  const limited = await edgeRateLimit('ORDER_RATE_LIMITER', `wa-order:${key}`, { limit: 5, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: 'Too many requests, try again shortly' }, { status: 429 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON body' }, { status: 400 });
  }

  const parsed = whatsappOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Check the name, phone and message fields' },
      { status: 422 }
    );
  }
  const { name, message, turnstileToken } = parsed.data;

  const human = await verifyTurnstile(turnstileToken, key);
  if (!human.ok) {
    return NextResponse.json(
      { error: 'Security check failed — please wait for it to finish and try again' },
      { status: 403 }
    );
  }

  const { settings } = await getSiteConfig();
  const greeting = `Hi ${settings.brand_name}, I'm ${name}. ${message || "I'd like to place an order."}`;
  const waUrl = await buildWaUrl(greeting);
  if (!waUrl) {
    return NextResponse.json({ error: 'WhatsApp ordering is not configured' }, { status: 503 });
  }

  return NextResponse.json({ ok: true, url: waUrl });
}
