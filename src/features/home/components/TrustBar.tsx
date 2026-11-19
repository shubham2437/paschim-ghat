'use client';

import { useSiteConfig } from '@/features/catalog/hooks/useSiteConfig';
import { useCatalogData } from '@/features/catalog/hooks/useCatalogData';
import { money } from '@/lib/utils/format';

/** Only states things the Sheet/settings actually back up. */
export function TrustBar() {
  const { data: site } = useSiteConfig();
  const { data: catalog } = useCatalogData();
  const fssai = site?.settings.fssai;
  const freeShipAbove = site?.settings.free_shipping_above ?? 0;

  return (
    <div className="trust">
      <div className="wrap trust-in">
        <div>
          <span className="trust-ic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </span>
          <span>
            <b>{catalog ? `${catalog.catalogSize} products` : 'Full product list'}</b>
            {catalog ? `Across ${catalog.categories.length} categories` : 'Loading…'}
          </span>
        </div>
        <div>
          <span className="trust-ic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 6v6l4 2" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <span><b>Live prices &amp; stock</b>Updated as our list changes</span>
        </div>
        <div>
          <span className="trust-ic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.7-5.2A8.5 8.5 0 1 1 21 12Z" />
            </svg>
          </span>
          <span><b>Order on WhatsApp</b>No account needed</span>
        </div>
        <div>
          <span className="trust-ic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 7h13v9H3zM16 10h3.5l1.5 3v3H16z" />
              <circle cx="7" cy="18" r="1.6" />
              <circle cx="18" cy="18" r="1.6" />
            </svg>
          </span>
          {freeShipAbove > 0 ? (
            <span><b>Free delivery over {money(freeShipAbove)}</b>On every order</span>
          ) : fssai ? (
            <span><b>FSSAI {fssai}</b>Licensed food business</span>
          ) : (
            <span><b>Delivery</b>Confirmed with your order</span>
          )}
        </div>
      </div>
    </div>
  );
}
