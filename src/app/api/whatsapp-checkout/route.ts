import { NextResponse } from 'next/server';
import { whatsappCheckoutSchema } from '@/lib/validation/schemas';
import { clientKeyFromHeaders, rateLimit } from '@/lib/server/rate-limit';
import { isTrustedOrigin } from '@/lib/server/origin-guard';
import { getSiteConfig } from '@/data/site-content.server';
import { buildWaUrl } from '@/lib/server/whatsapp';
import { money } from '@/lib/utils/format';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 8_000;

/**
 * "Checkout" for this concept storefront hands the basket off to WhatsApp
 * instead of a real payment flow — a common pattern for D2C storefronts in
 * India. This route builds the order-summary message server-side from the
 * client's cart contents (validated line-by-line) and returns a wa.me URL
 * pointed at the business number, which stays server-only.
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }

  const key = clientKeyFromHeaders(request.headers);
  const limited = rateLimit(`wa-checkout:${key}`, { limit: 10, windowMs: 60_000 });
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

  const parsed = whatsappCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Your basket looks invalid — please refresh and try again';
    return NextResponse.json({ error: message }, { status: 422 });
  }
  const { items, total, couponCode, customerName, addressLine1, addressLine2, city, pincode, phone } = parsed.data;

  const { settings } = await getSiteConfig();
  const lines = items.map(
    (it) => `• ${it.name}${it.desc ? ` (${it.desc})` : ''} x${it.qty} — ${money(it.price * it.qty)}`
  );
  const addressLines = [addressLine1, addressLine2, `${city} - ${pincode}`].filter(Boolean);
  const message = [
    `Hi ${settings.brand_name}, I'd like to order:`,
    ...lines,
    couponCode ? `Coupon: ${couponCode.toUpperCase()}` : null,
    `Total: ${money(total)}`,
    '',
    `Name: ${customerName}`,
    `Phone: ${phone}`,
    `Delivery address:`,
    ...addressLines,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const waUrl = await buildWaUrl(message);
  if (!waUrl) {
    return NextResponse.json({ error: 'WhatsApp ordering is not configured' }, { status: 503 });
  }

  return NextResponse.json({ ok: true, url: waUrl });
}
