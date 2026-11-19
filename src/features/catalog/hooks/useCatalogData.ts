'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import type { CategoryDef, ProductDTO } from '@/types/product';

export interface CatalogResponse {
  products: ProductDTO[];
  total: number;
  categories: CategoryDef[];
  catalogSize: number;
  maxPrice: number;
  version: number;
}

interface CatalogState {
  data: CatalogResponse | null;
  loading: boolean;
  error: string | null;
  /** Fetches the catalogue. `silent` = a background poll: no loading
   * state, and a failure keeps whatever is already on screen. `fresh` =
   * ask the server to re-read the Sheet first. */
  load: (silent?: boolean, fresh?: boolean) => Promise<void>;
}

const FETCH_TIMEOUT_MS = 10_000;
/** How often an open tab asks the server for Sheet changes. */
const POLL_INTERVAL_MS = 15_000;

let inFlight: Promise<void> | null = null;

const useCatalogStore = create<CatalogState>((set, get) => ({
  data: null,
  loading: true,
  error: null,
  load: (silent = false, fresh = false) => {
    if (inFlight) return inFlight;
    if (!silent) set({ loading: true, error: null });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    inFlight = fetch(fresh ? '/api/products?fresh=1' : '/api/products', { signal: controller.signal, cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load catalog (${res.status})`);
        return res.json() as Promise<CatalogResponse>;
      })
      .then((json) => {
        const current = get().data;
        // Same Sheet content as before: keep the existing object so nothing re-renders.
        if (current && current.version === json.version) {
          if (get().loading || get().error) set({ loading: false, error: null });
          return;
        }
        set({ data: json, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (silent && get().data) return;
        set({
          loading: false,
          error: err.name === 'AbortError' ? 'Catalog request timed out' : err.message,
        });
      })
      .finally(() => {
        clearTimeout(timer);
        inFlight = null;
      });
    return inFlight;
  },
}));

// Kept on globalThis so Fast Refresh in dev doesn't stack up extra timers.
const g = globalThis as unknown as { __catalogPolling?: boolean };

function startPolling() {
  if (g.__catalogPolling || typeof window === 'undefined') return;
  g.__catalogPolling = true;

  const { load } = useCatalogStore.getState();
  void load();

  window.setInterval(() => {
    if (document.visibilityState === 'visible') void useCatalogStore.getState().load(true);
  }, POLL_INTERVAL_MS);

  // Coming back to the tab (e.g. from editing the Sheet): have the server
  // re-read the Sheet and show the result straight away.
  const catchUp = () => {
    if (document.visibilityState === 'visible') void useCatalogStore.getState().load(true, true);
  };
  document.addEventListener('visibilitychange', catchUp);
  window.addEventListener('focus', catchUp);
}

/**
 * The live catalogue. All components share one copy; it is fetched once
 * and then re-checked every 15 seconds (and immediately whenever the tab
 * regains focus), so price, stock and product edits made in the Google Sheet show
 * up without reloading the page.
 */
export function useCatalogData(): { data: CatalogResponse | null; loading: boolean; error: string | null; retry: () => void } {
  const data = useCatalogStore((s) => s.data);
  const loading = useCatalogStore((s) => s.loading);
  const error = useCatalogStore((s) => s.error);
  const load = useCatalogStore((s) => s.load);

  useEffect(() => {
    startPolling();
  }, []);

  return { data, loading, error, retry: () => void load() };
}
