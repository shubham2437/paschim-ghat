'use client';

import { useUiStore } from '@/components/ui/ui-store';
import { useCatalogFilterStore } from '@/features/catalog/store/catalog-filter-store';
import { money } from '@/lib/utils/format';
import type { CategoryDef } from '@/types/product';

interface FiltersProps {
  categories: CategoryDef[];
  catalogSize: number;
  /** Slider ceiling, from the live catalogue. */
  priceCeiling: number;
}

export function Filters({ categories, catalogSize, priceCeiling }: FiltersProps) {
  const filtersOpen = useUiStore((s) => s.filtersOpen);
  const closeAll = useUiStore((s) => s.closeAll);
  const { category, maxPrice, setCategory, setMaxPrice, reset } = useCatalogFilterStore();

  const step = priceCeiling > 2000 ? 100 : 50;
  const value = maxPrice === null ? priceCeiling : Math.min(maxPrice, priceCeiling);

  return (
    <aside className={`filters ${filtersOpen ? 'on' : ''}`} aria-label="Filters">
      <div className="filters-hd">
        <b className="font-serif" style={{ fontSize: 17 }}>Filters</b>
        <button className="btn btn-sm" style={{ marginLeft: 'auto', color: 'var(--terra)', fontSize: 12 }} onClick={reset}>
          Clear all
        </button>
        <button className="iconbtn filters-close" aria-label="Close filters" onClick={closeAll}>✕</button>
      </div>

      <div className="fgroup">
        <h4>Category</h4>
        <label className="fopt">
          <input type="radio" name="fc" checked={category === 'all'} onChange={() => setCategory('all')} />
          <span>All products</span>
          <span className="n">{catalogSize}</span>
        </label>
        {categories.map((c) => (
          <label className="fopt" key={c.k}>
            <input type="radio" name="fc" checked={category === c.k} onChange={() => setCategory(c.k)} />
            <span>{c.n}</span>
            <span className="n">{c.count}</span>
          </label>
        ))}
      </div>

      <div className="fgroup">
        <h4>Max price</h4>
        <div className="rangebox">
          <input
            type="range"
            aria-label="Maximum price"
            min={step}
            max={priceCeiling}
            step={step}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value);
              setMaxPrice(n >= priceCeiling ? null : n);
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
          <span>{money(step)}</span>
          <span>{maxPrice === null ? 'Any price' : `Up to ${money(value)}`}</span>
        </div>
      </div>

      <button className="btn btn-primary btn-block btn-sm" style={{ marginTop: 16 }} onClick={closeAll}>
        Show results
      </button>
    </aside>
  );
}
