'use client';

import { useCatalogData } from '@/features/catalog/hooks/useCatalogData';
import { seedSiteConfig } from '@/features/catalog/hooks/useSiteConfig';
import type { SiteConfig } from '@/types/site-content';
import { Ticker } from '@/features/home/components/Ticker';
import { Hero } from '@/features/home/components/Hero';
import { TrustBar } from '@/features/home/components/TrustBar';
import { CategoryTiles } from '@/features/catalog/components/CategoryTiles';
import { ShopSection } from '@/features/catalog/components/ShopSection';
import { ContactBand } from '@/features/home/components/ContactBand';
import { ProductModal } from '@/features/catalog/components/ProductModal';

export function StoreApp({ initialSiteConfig }: { initialSiteConfig: SiteConfig }) {
  seedSiteConfig(initialSiteConfig);
  const { data } = useCatalogData();

  return (
    <main>
      <Ticker />
      <Hero />
      <TrustBar />

      {data && data.categories.length > 0 && (
        <section id="categories">
          <div className="wrap">
            <div className="sec-hd">
              <div>
                <span className="kicker">Shop by category</span>
                <h2>What are you looking for?</h2>
              </div>
              <a className="btn btn-ghost btn-sm" href="#shop">
                View all {data.catalogSize} products
              </a>
            </div>
            <CategoryTiles categories={data.categories} />
          </div>
        </section>
      )}

      <ShopSection />
      <ContactBand />
      <ProductModal />
    </main>
  );
}
