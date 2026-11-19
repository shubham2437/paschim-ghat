'use client';

import { create } from 'zustand';

export type SortKey = 'featured' | 'lo' | 'hi' | 'off';

interface CatalogFilterState {
  /** 'all' or a category key from the Sheet. */
  category: string;
  /** null = no price cap. */
  maxPrice: number | null;
  sort: SortKey;
  query: string;
  /** productId -> chosen pack index. */
  selectedVariant: Record<string, number>;
  setCategory: (c: string) => void;
  setMaxPrice: (n: number | null) => void;
  setSort: (s: SortKey) => void;
  setQuery: (q: string) => void;
  selectVariant: (productId: string, index: number) => void;
  reset: () => void;
}

export const useCatalogFilterStore = create<CatalogFilterState>((set) => ({
  category: 'all',
  maxPrice: null,
  sort: 'featured',
  query: '',
  selectedVariant: {},
  setCategory: (category) => set({ category }),
  setMaxPrice: (maxPrice) => set({ maxPrice }),
  setSort: (sort) => set({ sort }),
  setQuery: (query) => set({ query }),
  selectVariant: (productId, index) =>
    set((s) => ({ selectedVariant: { ...s.selectedVariant, [productId]: index } })),
  reset: () => set({ category: 'all', maxPrice: null, query: '' }),
}));
