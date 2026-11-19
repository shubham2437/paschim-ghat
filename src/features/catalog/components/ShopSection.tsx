'use client';

import { useMemo } from 'react';
import { useCatalogData } from '@/features/catalog/hooks/useCatalogData';
import { useCatalogFilterStore, type SortKey } from '@/features/catalog/store/catalog-filter-store';
import { filterAndSortProducts } from '@/features/catalog/filter-products';
import { Filters } from '@/features/catalog/components/Filters';
import { ProductGrid } from '@/features/catalog/components/ProductGrid';
import { useUiStore } from '@/components/ui/ui-store';

export function ShopSection() {
  const { data, loading, error, retry } = useCatalogData();
  const toggleFilters = useUiStore((s) => s.toggleFilters);
  const { category, maxPrice, sort, query, setCategory, setSort, reset } = useCatalogFilterStore();

  // A category picked earlier can disappear from the Sheet while the page is open.
  const activeCategory = category === 'all' || data?.categories.some((c) => c.k === category) ? category : 'all';

  const products = useMemo(() => {
    if (!data) return [];
    return filterAndSortProducts(data.products, { category: activeCategory, maxPrice, sort, query });
  }, [data, activeCategory, maxPrice, sort, query]);

  const categoryName = data?.categories.find((c) => c.k === activeCategory)?.n;

  return (
    <section id="shop" style={{ background: 'var(--cream-2)', borderBlock: '1px solid var(--line)' }}>
      <div className="wrap">
        <div className="sec-hd">
          <div>
            <span className="kicker">The full list</span>
            <h2>Shop everything</h2>
          </div>
          <button className="btn btn-ghost btn-sm filtersToggle" onClick={toggleFilters}>⚙ Filters</button>
        </div>
        <div className="shop">
          {data && (
            <Filters categories={data.categories} catalogSize={data.catalogSize} priceCeiling={data.maxPrice} />
          )}
          <div style={{ minWidth: 0 }}>
            <div className="chips">
              <button className={`chip ${activeCategory === 'all' ? 'on' : ''}`} onClick={() => setCategory('all')}>
                Everything
              </button>
              {data?.categories.map((c) => (
                <button
                  key={c.k}
                  className={`chip ${activeCategory === c.k ? 'on' : ''}`}
                  onClick={() => setCategory(c.k)}
                >
                  {c.n}
                </button>
              ))}
            </div>
            <div className="shop-bar">
              <span className="res" aria-live="polite">
                {loading && !data
                  ? 'Loading products…'
                  : error && !data
                    ? 'Could not load the products.'
                    : `${products.length} product${products.length === 1 ? '' : 's'}${
                        categoryName ? ' in ' + categoryName : ''
                      }${query ? ` for “${query}”` : ''}`}
              </span>
              <select
                className="sel"
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="featured">Sort: Featured</option>
                <option value="lo">Price: Low → High</option>
                <option value="hi">Price: High → Low</option>
                <option value="off">Biggest discount</option>
              </select>
            </div>
            {error && !data ? (
              <div className="empty">
                {error}{' '}
                <button className="btn btn-sm btn-ghost" onClick={retry}>Try again</button>
              </div>
            ) : data && products.length === 0 ? (
              <div className="empty">
                {data.catalogSize === 0 ? 'No products are listed yet.' : 'No products match those filters.'}{' '}
                {data.catalogSize > 0 && <button className="btn btn-sm btn-ghost" onClick={reset}>Reset</button>}
              </div>
            ) : (
              <ProductGrid products={products} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
