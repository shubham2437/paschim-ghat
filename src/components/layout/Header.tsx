'use client';

import { UtilityBar } from '@/components/layout/UtilityBar';
import { SearchBar } from '@/features/catalog/components/SearchBar';
import { useUiStore } from '@/components/ui/ui-store';
import { useCartStore } from '@/features/cart/store/cart-store';
import { useCatalogFilterStore } from '@/features/catalog/store/catalog-filter-store';
import { useCatalogData } from '@/features/catalog/hooks/useCatalogData';
import { BrandLogo } from '@/components/layout/BrandLogo';
import type { SiteSettings } from '@/types/site-content';

export function Header({ settings }: { settings: SiteSettings }) {
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav);
  const openCart = useUiStore((s) => s.openCart);
  const category = useCatalogFilterStore((s) => s.category);
  const setCategory = useCatalogFilterStore((s) => s.setCategory);
  const lines = useCartStore((s) => s.lines);
  const { data } = useCatalogData();

  const cartCount = Object.values(lines).reduce((n, l) => n + l.qty, 0);
  // Navigation mirrors the Sheet's categories — nothing is hardcoded.
  const nav = [{ k: 'all', n: 'All Products' }, ...(data?.categories ?? [])];

  return (
    <>
      <UtilityBar settings={settings} />
      <header className="site">
        <div className="wrap">
          <div className="hd">
            <button className="iconbtn burger" aria-label="Menu" onClick={toggleMobileNav}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <a className="logo" href="#top">
              <BrandLogo alt={`${settings.brand_name} logo`} priority />
              <span className="logo-tx">
                <b>{settings.brand_name}</b>
                <small>{settings.brand_sub}</small>
              </span>
            </a>
            <SearchBar />
            <div className="hd-act">
              <button className="iconbtn" aria-label={`Basket, ${cartCount} item${cartCount === 1 ? '' : 's'}`} onClick={openCart}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M3 5h2.2l2.1 10.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6" />
                  <circle cx="10" cy="20" r="1.4" />
                  <circle cx="18" cy="20" r="1.4" />
                </svg>
                {cartCount > 0 && <span className="pill-count">{cartCount}</span>}
              </button>
            </div>
          </div>
          <nav className="nav" aria-label="Categories">
            {nav.map((n) => (
              <a
                key={n.k}
                href="#shop"
                className={category === n.k ? 'on' : ''}
                onClick={() => setCategory(n.k)}
              >
                {n.n}
              </a>
            ))}
            <a href="#contact">Bulk orders</a>
          </nav>
        </div>
      </header>
    </>
  );
}
