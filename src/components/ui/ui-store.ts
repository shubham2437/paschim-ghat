'use client';

import { create } from 'zustand';

interface UiState {
  cartOpen: boolean;
  mobileNavOpen: boolean;
  filtersOpen: boolean;
  waModalOpen: boolean;
  activeProductId: string | null;
  openCart: () => void;
  closeAll: () => void;
  toggleMobileNav: () => void;
  toggleFilters: () => void;
  openProduct: (id: string) => void;
  closeProduct: () => void;
  openWaModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  cartOpen: false,
  mobileNavOpen: false,
  filtersOpen: false,
  waModalOpen: false,
  activeProductId: null,
  openCart: () => set({ cartOpen: true }),
  closeAll: () =>
    set({
      cartOpen: false,
      mobileNavOpen: false,
      filtersOpen: false,
      activeProductId: null,
      waModalOpen: false,
    }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  toggleFilters: () => set((s) => ({ filtersOpen: !s.filtersOpen })),
  openProduct: (id) => set({ activeProductId: id }),
  closeProduct: () => set({ activeProductId: null }),
  openWaModal: () => set({ waModalOpen: true }),
}));

export function isAnyOverlayOpen(state: UiState): boolean {
  return (
    state.cartOpen ||
    state.mobileNavOpen ||
    state.filtersOpen ||
    state.waModalOpen ||
    !!state.activeProductId
  );
}
