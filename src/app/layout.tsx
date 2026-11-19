import type { Metadata } from 'next';
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
  return {
    title: `${settings.brand_name} — ${names.slice(0, 4).join(', ') || settings.brand_sub}`,
    description: settings.hero_lead || describe(names),
  };
}

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
