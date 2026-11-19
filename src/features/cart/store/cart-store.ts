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

/**
 * @param freeShipAt  order value that unlocks free delivery (0 = no such offer)
 * @param shipCost    flat delivery fee (0 = none added; confirmed on WhatsApp)
 */
export function cartTotals(lines: Record<string, CartLine>, freeShipAt = 0, shipCost = 0) {
  let sub = 0;
  let mrp = 0;
  let items = 0;
  for (const line of Object.values(lines)) {
    sub += line.price * line.qty;
    mrp += line.mrp * line.qty;
    items += line.qty;
  }
  const qualifiesFree = freeShipAt > 0 && sub >= freeShipAt;
  const ship = sub > 0 && shipCost > 0 && !qualifiesFree ? shipCost : 0;
  return { sub, mrp, items, ship, total: sub + ship, saved: mrp - sub, freeShipAt };
}
