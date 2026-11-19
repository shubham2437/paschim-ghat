import { NextResponse } from 'next/server';
import { getPublicSiteConfig } from '@/data/site-content.server';
import { clientKeyFromHeaders, rateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const key = clientKeyFromHeaders(request.headers);
  const limited = rateLimit(`site-config:${key}`, { limit: 120, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // The public config omits the business WhatsApp number.
  const config = await getPublicSiteConfig();
  return NextResponse.json(config);
}
