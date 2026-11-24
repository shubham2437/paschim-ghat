import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { getPublicSiteConfig } from '@/data/site-content.server';
import { getCatalogSnapshot } from '@/data/catalog.server';
import { ToastProvider } from '@/components/ui/toast-provider';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppFloat } from '@/components/layout/WhatsAppFloat';
import { CartDrawer } from '@/features/cart/components/CartDrawer';
import { Scrim } from '@/components/ui/Scrim';
import { WhatsAppOrderModal } from '@/features/support/WhatsAppOrderModal';
import { getSiteUrl } from '@/lib/seo';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

function describe(categoryNames: string[]): string {
  if (!categoryNames.length) return 'Order on WhatsApp.';
  const list =
    categoryNames.length > 1
      ? `${categoryNames.slice(0, -1).join(', ')} and ${categoryNames[categoryNames.length - 1]}`
      : (categoryNames[0] as string);
  return `${list} — pick your pack size and order on WhatsApp.`;
}

export async function generateMetadata(): Promise<Metadata> {
  const [{ settings }, { categories }] = await Promise.all([getPublicSiteConfig(), getCatalogSnapshot()]);
  const names = categories.map((c) => c.n);
  const title = `${settings.brand_name} — ${names.slice(0, 4).join(', ') || settings.brand_sub}`;
  const description = settings.hero_lead || describe(names);
  const logo = { url: '/logo.png', alt: `${settings.brand_name} logo` };
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: title, template: `%s | ${settings.brand_name}` },
    description,
    applicationName: settings.brand_name,
    alternates: { canonical: '/' },
    keywords: names,
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: settings.brand_name,
      url: '/',
      title,
      description,
      images: [logo],
    },
    twitter: { card: 'summary', title, description, images: [logo.url] },
  };
}

export const viewport: Viewport = { themeColor: '#12362A', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { settings } = await getPublicSiteConfig();

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <ToastProvider>
          <MobileNav />
          <Header settings={settings} />
          {children}
          <Footer settings={settings} />
          <WhatsAppFloat />
          <Scrim />
          <CartDrawer />
          <WhatsAppOrderModal />
        </ToastProvider>
      </body>
    </html>
  );
}
