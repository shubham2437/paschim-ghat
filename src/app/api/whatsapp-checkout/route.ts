import { NextResponse } from 'next/server';
import { whatsappCheckoutSchema } from '@/lib/validation/schemas';
import { guardOrderRequest } from '@/lib/server/order-guard';
import { verifyTurnstile } from '@/lib/server/turnstile';
import { getSiteConfig } from '@/data/site-content.server';
import { getCatalogSnapshot } from '@/data/catalog.server';
import { buildWaUrl } from '@/lib/server/whatsapp';
import { money } from '@/lib/utils/format';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 8_000;

/**
 * "Checkout" for this storefront hands the basket off to WhatsApp instead of
 * a real payment flow. The browser only sends WHICH packs and HOW MANY: names,
 * prices, coupon discount, delivery and the total are all recomputed here
 * from the catalogue, so a tampered request cannot change what is charged.
 * The business number stays server-only.
 */
export async function POST(request: Request) {
  const guarded = await guardOrderRequest(request, 'wa-checkout', MAX_BODY_BYTES);
  if (!guarded.ok) return guarded.response;

  const parsed = whatsappCheckoutSchema.safeParse(guarded.body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Your basket looks invalid — please refresh and try again';
    return NextResponse.json({ error: message }, { status: 422 });
  }
  const { items, couponCode, customerName, addressLine1, addressLine2, city, pincode, phone, turnstileToken } =
    parsed.data;

  const human = await verifyTurnstile(turnstileToken, guarded.ip);
  if (!human.ok) return NextResponse.json({ error: human.error }, { status: human.status });

  const [{ products }, { settings, coupons }] = await Promise.all([getCatalogSnapshot(), getSiteConfig()]);

  // Resolve every line against the live catalogue; merge duplicates.
  const resolved = new Map<string, { name: string; pack: string; price: number; qty: number }>();
  for (const it of items) {
    const product = products.find((p) => p.id === it.productId);
    const variant = product?.vars.find((v) => (it.sku ? v.sku === it.sku : v.w === it.desc));
    if (!product || !variant) {
      return NextResponse.json(
        { error: 'An item in your basket is no longer available — please refresh and try again' },
        { status: 409 }
      );
    }
    if (variant.avail === 'out') {
      return NextResponse.json({ error: `${product.name} (${variant.w}) is out of stock` }, { status: 409 });
    }
    const key = `${product.id}|${variant.sku || variant.w}`;
    const existing = resolved.get(key);
    const qty = (existing?.qty ?? 0) + it.qty;
    if (qty > 99) {
      return NextResponse.json({ error: 'Maximum 99 of one item per order' }, { status: 422 });
    }
    resolved.set(key, { name: product.name, pack: variant.w, price: variant.p, qty });
  }

  const lineList = [...resolved.values()];
  const sub = lineList.reduce((n, l) => n + l.price * l.qty, 0);

  let coupon = null;
  if (couponCode) {
    coupon = coupons.find((c) => c.code.toUpperCase() === couponCode.toUpperCase()) ?? null;
    if (!coupon) {
      return NextResponse.json({ error: 'That coupon code is not valid' }, { status: 422 });
    }
  }
  let discount = 0;
  if (coupon?.type === 'pct') discount = Math.round((sub * coupon.value) / 100);
  if (coupon?.type === 'flat') discount = Math.min(coupon.value, sub);
  const qualifiesFree = settings.free_shipping_above > 0 && sub >= settings.free_shipping_above;
  const ship = coupon?.type === 'ship' || qualifiesFree || settings.delivery_fee <= 0 ? 0 : settings.delivery_fee;
  const total = Math.max(0, sub - discount) + ship;

  const lines = lineList.map((l) => `• ${l.name} (${l.pack}) x${l.qty} — ${money(l.price * l.qty)}`);
  const addressLines = [addressLine1, addressLine2, `${city} - ${pincode}`].filter(Boolean);
  const message = [
    `Hi ${settings.brand_name}, I'd like to order:`,
    ...lines,
    coupon ? `Coupon: ${coupon.code.toUpperCase()}` : null,
    `Total: ${money(total)}`,
    '',
    `Name: ${customerName}`,
    `Phone: ${phone}`,
    `Delivery address:`,
    ...addressLines,
  ]
    .filter((l) => l !== null)
    .join('\n');

  const waUrl = await buildWaUrl(message);
  if (!waUrl) {
    return NextResponse.json({ error: 'WhatsApp ordering is not configured' }, { status: 503 });
  }

  return NextResponse.json({ ok: true, url: waUrl });
}
