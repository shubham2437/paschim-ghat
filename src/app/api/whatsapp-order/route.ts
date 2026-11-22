import { NextResponse } from 'next/server';
import { whatsappOrderSchema } from '@/lib/validation/schemas';
import { guardOrderRequest } from '@/lib/server/order-guard';
import { verifyTurnstile } from '@/lib/server/turnstile';
import { getSiteConfig } from '@/data/site-content.server';
import { buildWaUrl } from '@/lib/server/whatsapp';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4_000;

export async function POST(request: Request) {
  const guarded = await guardOrderRequest(request, 'wa-order', MAX_BODY_BYTES);
  if (!guarded.ok) return guarded.response;

  const parsed = whatsappOrderSchema.safeParse(guarded.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Check the name, phone and message fields' },
      { status: 422 }
    );
  }
  const { name, message, turnstileToken } = parsed.data;

  const human = await verifyTurnstile(turnstileToken, guarded.ip);
  if (!human.ok) return NextResponse.json({ error: human.error }, { status: human.status });

  const { settings } = await getSiteConfig();
  const greeting = `Hi ${settings.brand_name}, I'm ${name}. ${message || "I'd like to place an order."}`;
  const waUrl = await buildWaUrl(greeting);
  if (!waUrl) {
    return NextResponse.json({ error: 'WhatsApp ordering is not configured' }, { status: 503 });
  }

  return NextResponse.json({ ok: true, url: waUrl });
}
