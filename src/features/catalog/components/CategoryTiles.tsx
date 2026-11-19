'use client';

import { ProductArt } from '@/features/catalog/components/ProductArt';
import { useCatalogFilterStore } from '@/features/catalog/store/catalog-filter-store';
import type { CategoryDef } from '@/types/product';

export function CategoryTiles({ categories }: { categories: CategoryDef[] }) {
  const setCategory = useCatalogFilterStore((s) => s.setCategory);

  return (
    <div className="cats">
      {categories.map((c, i) => (
        <a key={c.k} className="cat" href="#shop" onClick={() => setCategory(c.k)}>
          <div className="art">
            <ProductArt kind={c.art} seed={i * 23 + 5} w={300} h={200} />
          </div>
          <b>{c.n}</b>
          <span>
            {c.count} {c.count === 1 ? 'product' : 'products'}
          </span>
        </a>
      ))}
    </div>
  );
}
