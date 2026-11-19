import 'server-only';
import { getSheet, getWorkbookVersion } from '@/data/workbook.server';
import type { CouponDef, SiteConfig, SiteSettings } from '@/types/site-content';

/**
 * Optional storefront content. The catalogue Sheet only needs its
 * `Products` tab; these three extra tabs are read if someone adds them:
 *
 *   Settings — columns `key`, `value` (keys = the SiteSettings fields)
 *   Offers   — column `text` (one ticker line per row)
 *   Coupons  — columns `code`, `type` (pct | flat | ship), `value`, `label`
 *
 * Without them the defaults below apply: no delivery fee is added, no
 * coupons exist, and no offer ticker is shown.
 */

function str(v: string | undefined): string {
  return v ?? '';
}

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(str(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: 'Pachimghat',
  brand_sub: 'Natural · Pure · Wholesome',
  hero_line1: 'A piece of *nature*',
  hero_line2: 'from the Western Ghats.',
  hero_lead: '',
  hero_badge: '',
  free_shipping_above: 0,
  delivery_fee: 0,
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '8667411932',
  whatsapp: '',
  email: 'pachimghat@gmail.com',
  fssai: '',
  gstin: '',
  address: '',
};

const globalForSite = globalThis as unknown as {
  __siteConfig?: SiteConfig & { forVersion: number };
};

export async function getSiteConfig(): Promise<SiteConfig> {
  const version = await getWorkbookVersion();
  if (globalForSite.__siteConfig?.forVersion === version) return globalForSite.__siteConfig;

  const [settingsRows, couponRows, offerRows] = await Promise.all([
    getSheet('Settings'),
    getSheet('Coupons'),
    getSheet('Offers'),
  ]);

  const settingsMap: Record<string, string> = {};
  for (const r of settingsRows) {
    const key = str(r.key);
    if (key && key in DEFAULT_SETTINGS) settingsMap[key] = str(r.value);
  }
  const settings: SiteSettings = {
    ...DEFAULT_SETTINGS,
    ...settingsMap,
    free_shipping_above: Math.max(0, num(settingsMap.free_shipping_above, DEFAULT_SETTINGS.free_shipping_above)),
    delivery_fee: Math.max(0, num(settingsMap.delivery_fee, DEFAULT_SETTINGS.delivery_fee)),
  };

  const coupons: CouponDef[] = couponRows
    .filter((c) => str(c.code))
    .map((c) => ({
      code: str(c.code).toUpperCase(),
      type: (['pct', 'flat', 'ship'].includes(str(c.type)) ? str(c.type) : 'flat') as CouponDef['type'],
      value: num(c.value),
      label: str(c.label) || str(c.code),
    }));

  const offers = offerRows.map((o) => str(o.text)).filter(Boolean);

  const config = { settings, coupons, offers, forVersion: version };
  globalForSite.__siteConfig = config;
  return config;
}

/** What the browser is allowed to see: everything except the business
 * WhatsApp number, which stays server-side (see lib/server/whatsapp.ts). */
export async function getPublicSiteConfig(): Promise<SiteConfig> {
  const { settings, coupons, offers } = await getSiteConfig();
  return { settings: { ...settings, whatsapp: '' }, coupons, offers };
}
