import { getPublicSiteConfig } from '@/data/site-content.server';
import { getCatalogSnapshot } from '@/data/catalog.server';
import { StoreApp } from '@/features/home/StoreApp';
import { getSiteUrl, jsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [initialSiteConfig, { products }] = await Promise.all([getPublicSiteConfig(), getCatalogSnapshot()]);
  const { settings } = initialSiteConfig;
  const site = getSiteUrl();

  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Store',
        '@id': `${site}/#store`,
        name: settings.brand_name,
        description: settings.brand_sub,
        url: `${site}/`,
        logo: `${site}/logo.png`,
        image: `${site}/logo.png`,
        ...(settings.phone && { telephone: settings.phone }),
        ...(settings.email && { email: settings.email }),
        ...(settings.address && { address: { '@type': 'PostalAddress', streetAddress: settings.address, addressCountry: 'IN' } }),
        priceRange: '₹',
      },
      {
        '@type': 'ItemList',
        name: `${settings.brand_name} products`,
        itemListElement: products.slice(0, 100).map((p, i) => {
          const prices = p.vars.map((v) => v.p).filter((n) => n > 0);
          return {
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Product',
              name: p.name,
              ...(p.desc && { description: p.desc }),
              category: p.catName,
              image: `${site}/art?kind=${p.art}&seed=${p.seed}&w=520&h=400`,
              brand: { '@type': 'Brand', name: settings.brand_name },
              ...(prices.length && {
                offers: {
                  '@type': 'AggregateOffer',
                  priceCurrency: 'INR',
                  lowPrice: Math.min(...prices),
                  highPrice: Math.max(...prices),
                  offerCount: prices.length,
                  availability: p.stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                },
              }),
            },
          };
        }),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <StoreApp initialSiteConfig={initialSiteConfig} />
    </>
  );
}
