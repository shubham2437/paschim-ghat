import { NextResponse } from 'next/server';
import { refreshWorkbookNow } from '@/data/workbook.server';
import { getCatalogSnapshot } from '@/data/catalog.server';
import { clientKeyFromHeaders, rateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Open /api/refresh in a browser after editing the Sheet to pull the
 * changes immediately and see what the site now has. Exposes only counts,
 * never Sheet contents, and is throttled both here and in the workbook
 * cache.
 */
export async function GET(request: Request) {
  const key = clientKeyFromHeaders(request.headers);
  const limited = rateLimit(`refresh:${key}`, { limit: 20, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const info = await refreshWorkbookNow();
  const { products, categories } = await getCatalogSnapshot();

  return NextResponse.json({
    ok: info.source === 'remote',
    source: info.source,
    lastSyncedAt: new Date(info.loadedAt).toISOString(),
    products: products.length,
    packSizes: products.reduce((n, p) => n + p.vars.length, 0),
    categories: categories.map((c) => `${c.n} (${c.count})`),
  });
}
