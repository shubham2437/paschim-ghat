'use client';

import { useUiStore } from '@/components/ui/ui-store';
import { useCatalogFilterStore } from '@/features/catalog/store/catalog-filter-store';
import { useCatalogData } from '@/features/catalog/hooks/useCatalogData';

export function MobileNav() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const closeAll = useUiStore((s) => s.closeAll);
  const openWaModal = useUiStore((s) => s.openWaModal);
  const setCategory = useCatalogFilterStore((s) => s.setCategory);
  const { data } = useCatalogData();

  const links = [{ k: 'all', n: 'All Products' }, ...(data?.categories ?? [])];

  return (
    <nav className={`mnav ${open ? 'on' : ''}`} aria-label="Menu" aria-hidden={!open}>
      <div className="mnav-hd">
        <b style={{ fontFamily: 'var(--font-fraunces)', fontSize: 20 }}>Menu</b>
        <button className="iconbtn" aria-label="Close menu" onClick={closeAll} tabIndex={open ? 0 : -1}>✕</button>
      </div>
      {links.map((l) => (
        <a
          key={l.k}
          href="#shop"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            setCategory(l.k);
            closeAll();
          }}
        >
          {l.n}
        </a>
      ))}
      <a href="/api/price-list" tabIndex={open ? 0 : -1} onClick={closeAll}>⬇ Download price list</a>
      <button
        className="btn btn-gold btn-block"
        style={{ marginTop: 14 }}
        tabIndex={open ? 0 : -1}
        onClick={() => {
          closeAll();
          openWaModal();
        }}
      >
        ✆ Order on WhatsApp
      </button>
    </nav>
  );
}
