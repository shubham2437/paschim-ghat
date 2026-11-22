'use client';

import { create } from 'zustand';
import type { ArtKind, Product, ProductVariant } from '@/types/product';

export interface CartLine {
  key: string;
  productId: string;
  sku: string;
  name: string;
  /** Pack label, e.g. "250g". */
  desc: string;
  price: number;
  mrp: number;
  qty: number;
  seed: number;
  art: ArtKind;
}

/** Keyed by product + pack (not by position), so a basket survives rows
 * being reordered in the Sheet while the page is open. */
export function lineKey(product: Product, variant: ProductVariant): string {
  return `${product.id}|${variant.sku || variant.w}`;
}

interface CartState {
  lines: Record<string, CartLine>;
  addProduct: (product: Product, variant: ProductVariant, delta: number) => void;
  incLine: (key: string) => void;
  decLine: (key: string) => void;
}

export const useCartStore = create<CartState>((set) => ({
  lines: {},

  addProduct: (product, variant, delta) =>
    set((state) => {
      const key = lineKey(product, variant);
      const nextQty = (state.lines[key]?.qty ?? 0) + delta;
      const lines = { ...state.lines };
      if (nextQty <= 0) {
        delete lines[key];
      } else {
        lines[key] = {
          key,
          productId: product.id,
          sku: variant.sku,
          name: product.name,
          desc: variant.w,
          price: variant.p,
          mrp: variant.mrp,
          qty: nextQty,
          seed: product.seed,
          art: product.art,
        };
      }
      return { lines };
    }),

  incLine: (key) =>
    set((state) => {
      const existing = state.lines[key];
      if (!existing) return state;
      return { lines: { ...state.lines, [key]: { ...existing, qty: existing.qty + 1 } } };
    }),

  decLine: (key) =>
    set((state) => {
      const existing = state.lines[key];
      if (!existing) return state;
      const lines = { ...state.lines };
      if (existing.qty <= 1) delete lines[key];
      else lines[key] = { ...existing, qty: existing.qty - 1 };
      return { lines };
    }),
}));

// Shared with the checkout API so client and server compute totals identically.
export { cartTotals } from '@/lib/pricing';
