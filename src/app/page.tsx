import { getPublicSiteConfig } from '@/data/site-content.server';
import { StoreApp } from '@/features/home/StoreApp';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const initialSiteConfig = await getPublicSiteConfig();
  return <StoreApp initialSiteConfig={initialSiteConfig} />;
}
