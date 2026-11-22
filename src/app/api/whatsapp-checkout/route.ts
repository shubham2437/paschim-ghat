import { NextResponse } from 'next/server';
import { whatsappCheckoutSchema } from '@/lib/validation/schemas';
import { clientKeyFromHeaders, edgeRateLimit } from '@/lib/server/rate-limit';
import { isTrustedOrigin } from '@/lib/server/origin-guard';
import { verifyTurnstile } from '@/lib/server/turnstile';
import { getSiteConfig } from '@/data/site-content.server';
import { getCatalogSnapshot } from '@/data/catalog.server';
import { buildWaUrl } from '@/lib/server/whatsapp';
import { applyCoupon, cartTotals } from '@/lib/pricing';
import { money } from '@/lib/utils/format';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 8_000;

/**
 * "Checkout" for this storefront hands the basket off to WhatsApp instead of
 * a real payment flow — a common pattern for D2C storefronts in India. This
 * route builds the order-summary message server-side and returns a wa.me URL
 * pointed at the business number, which stays server-only.
 *
 * Nothing about prices is trusted from the browser: the client only sends
 * product IDs and quantities, and every name, price, coupon discount and the
 * total are recomputed here from the catalogue Sheet.
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }

  // 10 requests per minute per IP, counted across all of Cloudflare's network
  // (CHECKOUT_RATE_LIMITER in wrangler.jsonc).
  const key = clientKeyFromHeaders(request.headers);
  const limited = await edgeRateLimit('CHECKOUT_RATE_LIMITER', `wa-checkout:${key}`, {
    limit: 10,
    windowMs: 60_000,
  });
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
  const { items, couponCode, turnstileToken, customerName, addressLine1, addressLine2, city, pincode, phone } =
    parsed.data;

  const human = await verifyTurnstile(turnstileToken, key);
  if (!human.ok) {
    return NextResponse.json(
      { error: 'Security check failed — please wait for it to finish and try again' },
      { status: 403 }
    );
  }

  const [{ settings, coupons }, { products }] = await Promise.all([getSiteConfig(), getCatalogSnapshot()]);

  // Re-price every line from the catalogue.
  const priced: { name: string; desc: string; price: number; mrp: number; qty: number }[] = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    const variant = product?.vars.find((v) => (item.sku ? v.sku === item.sku : v.w === item.desc));
    if (!product || !variant) {
      return NextResponse.json(
        { error: 'An item in your basket is no longer available — please refresh the page' },
        { status: 409 }
      );
    }
    if (variant.avail === 'out') {
      return NextResponse.json(
        { error: `${product.name} (${variant.w}) is out of stock — please remove it from your basket` },
        { status: 409 }
      );
    }
    priced.push({ name: product.name, desc: variant.w, price: variant.p, mrp: variant.mrp, qty: item.qty });
  }

  const coupon = couponCode ? coupons.find((c) => c.code === couponCode.toUpperCase()) : undefined;
  if (couponCode && !coupon) {
    return NextResponse.json({ error: 'That coupon code is not valid' }, { status: 422 });
  }

  const T = cartTotals(priced, settings.free_shipping_above, settings.delivery_fee);
  const { total } = applyCoupon(T.sub, T.ship, coupon);

  const lines = priced.map(
    (it) => `• ${it.name}${it.desc ? ` (${it.desc})` : ''} x${it.qty} — ${money(it.price * it.qty)}`
  );
  const addressLines = [addressLine1, addressLine2, `${city} - ${pincode}`].filter(Boolean);
  const message = [
    `Hi ${settings.brand_name}, I'd like to order:`,
    ...lines,
    coupon ? `Coupon: ${coupon.code}` : null,
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
