import type { Product, ProductVariant } from '@/types/product';

export const money = (n: number): string => '₹' + Math.round(n).toLocaleString('en-IN');

/** "₹80/100g" or "₹25/100ml" for weight/volume packs; '' for pieces/packs. */
export function perUnit(v: ProductVariant): string {
  if (!(v.size > 0)) return '';
  const unit = v.unit.toLowerCase();
  if (unit === 'g' || unit === 'kg') {
    const grams = v.size * (unit === 'kg' ? 1000 : 1);
    return `${money((v.p / grams) * 100)}/100g`;
  }
  if (unit === 'ml' || unit === 'l') {
    const ml = v.size * (unit === 'l' ? 1000 : 1);
    return `${money((v.p / ml) * 100)}/100ml`;
  }
  return '';
}

/** Discount % of a pack, from MRP vs selling price. */
export const off = (v: ProductVariant): number =>
  v.mrp > v.p ? Math.round(((v.mrp - v.p) / v.mrp) * 100) : 0;

/** Lowest-priced pack — `vars` is sorted by price on the server. */
export function cheapestVariant(p: Product): ProductVariant {
  return p.vars.reduce((min, v) => (v.p < min.p ? v : min), p.vars[0] as ProductVariant);
}

/** The pack a card shows first: the cheapest one that is in stock. */
export function defaultVariantIndex(p: Product): number {
  const i = p.vars.findIndex((v) => v.avail !== 'out');
  return i < 0 ? 0 : i;
}

/** Resolves a remembered pack choice against the current (live) list. */
export function resolveVariantIndex(p: Product, chosen: number | undefined): number {
  return chosen !== undefined && chosen >= 0 && chosen < p.vars.length ? chosen : defaultVariantIndex(p);
}
