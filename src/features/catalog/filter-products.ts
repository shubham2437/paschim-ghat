import type { ProductDTO } from '@/types/product';
import { off, cheapestVariant } from '@/lib/utils/format';
import type { SortKey } from '@/features/catalog/store/catalog-filter-store';

export interface FilterParams {
  category: string;
  maxPrice: number | null;
  sort: SortKey;
  query: string;
}

export function filterAndSortProducts(products: ProductDTO[], f: FilterParams): ProductDTO[] {
  const terms = f.query.toLowerCase().split(/\s+/).filter(Boolean);

  const list = products.filter((p) => {
    if (f.category !== 'all' && p.cat !== f.category) return false;
    if (f.maxPrice !== null && cheapestVariant(p).p > f.maxPrice) return false;
    if (terms.length && !terms.every((t) => p.hay.includes(t))) return false;
    return true;
  });

  const price = (p: ProductDTO) => cheapestVariant(p).p;
  switch (f.sort) {
    case 'lo':
      return list.sort((a, b) => price(a) - price(b));
    case 'hi':
      return list.sort((a, b) => price(b) - price(a));
    case 'off':
      return list.sort((a, b) => off(cheapestVariant(b)) - off(cheapestVariant(a)));
    default:
      // Sheet order.
      return list.sort((a, b) => a.order - b.order);
  }
}
