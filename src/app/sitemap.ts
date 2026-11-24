import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  // Single-page storefront: product and category views live on "/".
  return [{ url: `${getSiteUrl()}/`, changeFrequency: 'daily', priority: 1 }];
}
