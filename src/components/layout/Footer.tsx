'use client';

import { BrandLogo } from '@/components/layout/BrandLogo';
import { useUiStore } from '@/components/ui/ui-store';
import { useCatalogData } from '@/features/catalog/hooks/useCatalogData';
import { useCatalogFilterStore } from '@/features/catalog/store/catalog-filter-store';
import type { SiteSettings } from '@/types/site-content';

export function Footer({ settings }: { settings: SiteSettings }) {
  const openWaModal = useUiStore((s) => s.openWaModal);
  const setCategory = useCatalogFilterStore((s) => s.setCategory);
  const { data } = useCatalogData();
  const legal = [
    settings.fssai && `FSSAI Lic. ${settings.fssai}`,
    settings.gstin && `GSTIN ${settings.gstin}`,
    settings.address,
  ].filter(Boolean) as string[];

  return (
    <footer>
      <div className="jaali" />
      <div className="wrap">
        <div className="f-grid">
          <div>
            <div className="logo" style={{ marginBottom: 12 }}>
              <BrandLogo alt={`${settings.brand_name} logo`} />
              <span className="logo-tx" style={{ color: '#F3E7CE' }}>
                <b>{settings.brand_name}</b>
                <small style={{ color: '#9A8E7B' }}>{settings.brand_sub}</small>
              </span>
            </div>
            {legal.length > 0 && (
              <p style={{ fontSize: 12, marginTop: 12, color: '#8E8271' }}>
                {legal.map((line) => (
                  <span key={line} style={{ display: 'block' }}>{line}</span>
                ))}
              </p>
            )}
          </div>
          <div>
            <h5>Shop</h5>
            <a href="#shop" onClick={() => setCategory('all')}>All Products</a>
            {data?.categories.map((c) => (
              <a key={c.k} href="#shop" onClick={() => setCategory(c.k)}>{c.n}</a>
            ))}
          </div>
          <div>
            <h5>Help</h5>
            <a href="/api/price-list">Download price list</a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                openWaModal();
              }}
            >
              Order on WhatsApp
            </a>
            {settings.phone && <a href={`tel:${settings.phone.replace(/[^0-9+]/g, '')}`}>Call {settings.phone}</a>}
            {settings.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}
          </div>
        </div>
        <div className="f-bot">
          <span>© {new Date().getFullYear()} {settings.brand_name}</span>
        </div>
      </div>
    </footer>
  );
}
