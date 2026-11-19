import { NextResponse } from 'next/server';
import { getCatalogSnapshot } from '@/data/catalog.server';
import { refreshWorkbookNow } from '@/data/workbook.server';
import { productQuerySchema } from '@/lib/validation/schemas';
import { clientKeyFromHeaders, rateLimit } from '@/lib/server/rate-limit';
import { cheapestVariant, off } from '@/lib/utils/format';
import type { Product } from '@/types/product';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const key = clientKeyFromHeaders(request.headers);
  // The storefront polls this route for live Sheet updates (twice a minute
  // per open tab), so the allowance is generous.
  const limited = rateLimit(`products:${key}`, { limit: 240, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const url = new URL(request.url);
  const parsed = productQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }
  const { category, q, maxPrice, sort, fresh } = parsed.data;

  if (fresh) await refreshWorkbookNow();

  const { products, categories, maxPrice: priceCeiling, version, searchHay } = await getCatalogSnapshot();

  let list = products.filter((p) => {
    if (category && category !== 'all' && p.cat !== category) return false;
    if (maxPrice !== undefined && cheapestVariant(p).p > maxPrice) return false;
    if (q) {
      const hay = searchHay(p);
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });

  const price = (p: Product) => cheapestVariant(p).p;
  switch (sort) {
    case 'lo':
      list = [...list].sort((a, b) => price(a) - price(b));
      break;
    case 'hi':
      list = [...list].sort((a, b) => price(b) - price(a));
      break;
    case 'off':
      list = [...list].sort((a, b) => off(cheapestVariant(b)) - off(cheapestVariant(a)));
      break;
    default:
      list = [...list].sort((a, b) => a.order - b.order);
  }

  return NextResponse.json({
    products: list.map((p) => ({ ...p, hay: searchHay(p) })),
    total: list.length,
    categories,
    catalogSize: products.length,
    maxPrice: priceCeiling,
    /** Changes whenever the Sheet's content changes. */
    version,
  });
}
