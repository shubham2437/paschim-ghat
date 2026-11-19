'use client';

import { useMemo, useState } from 'react';
import { useCatalogData } from '@/features/catalog/hooks/useCatalogData';
import { filterAndSortProducts } from '@/features/catalog/filter-products';
import { useCatalogFilterStore } from '@/features/catalog/store/catalog-filter-store';
import { useUiStore } from '@/components/ui/ui-store';
import { ProductArt } from '@/features/catalog/components/ProductArt';
import { money, cheapestVariant } from '@/lib/utils/format';

export function SearchBar() {
  const { data } = useCatalogData();
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const setQuery = useCatalogFilterStore((s) => s.setQuery);
  const setCategory = useCatalogFilterStore((s) => s.setCategory);
  const openProduct = useUiStore((s) => s.openProduct);

  const hits = useMemo(() => {
    if (!data || input.trim().length < 2) return [];
    return filterAndSortProducts(data.products, {
      category: 'all',
      maxPrice: null,
      sort: 'featured',
      query: input,
    }).slice(0, 6);
  }, [data, input]);

  // Placeholder suggestions come from the live list, not a hardcoded menu.
  const examples = (data?.products ?? []).slice(0, 3).map((p) => p.name.toLowerCase());
  const placeholder = examples.length ? `Search ${examples.join(', ')}…` : 'Search products…';

  return (
    <div className="search">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
      <input
        type="search"
        placeholder={placeholder}
        autoComplete="off"
        aria-label="Search products"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
          if (!e.target.value) setQuery('');
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setCategory('all');
            setQuery(input.trim());
            setOpen(false);
            (e.target as HTMLInputElement).blur();
            document.getElementById('shop')?.scrollIntoView();
          }
        }}
      />
      <div className={`sugg ${open && input.trim().length >= 2 ? 'on' : ''}`}>
        {hits.length ? (
          hits.map((p) => (
            <button
              key={p.id}
              onMouseDown={() => {
                openProduct(p.id);
                setOpen(false);
              }}
            >
              <span className="thumb">
                <ProductArt kind={p.art} seed={p.seed} w={80} h={80} />
              </span>
              <span>
                <b>{p.name}</b>
                <br />
                <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>
                  {p.catName} · from {money(cheapestVariant(p).p)}
                </span>
              </span>
            </button>
          ))
        ) : (
          <div style={{ padding: 14, color: 'var(--muted)', fontSize: 13 }}>
            Nothing matches &ldquo;{input}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
