/** Everything here is optional content. None of it is needed for the
 * catalogue to work — add a `Settings`, `Offers` or `Coupons` tab to the
 * Sheet to override the defaults (see README). */
export interface SiteSettings {
  brand_name: string;
  brand_sub: string;
  /** Words wrapped in *stars* render in gold italic. */
  hero_line1: string;
  hero_line2: string;
  /** Blank = a sentence is built from the Sheet's category names. */
  hero_lead: string;
  /** Blank = no badge. */
  hero_badge: string;
  /** 0 = no free-delivery threshold is advertised. */
  free_shipping_above: number;
  /** 0 = no delivery fee is added; it is confirmed on WhatsApp instead. */
  delivery_fee: number;
  phone: string;
  whatsapp: string;
  email: string;
  fssai: string;
  gstin: string;
  address: string;
}

export interface CouponDef {
  code: string;
  type: 'pct' | 'flat' | 'ship';
  value: number;
  label: string;
}

export interface SiteConfig {
  settings: SiteSettings;
  coupons: CouponDef[];
  offers: string[];
  /** Public Cloudflare Turnstile site key ('' = bot check not configured).
   * Read from the TURNSTILE_SITE_KEY runtime variable, so it can be changed
   * in the Cloudflare dashboard without a rebuild. */
  turnstileSiteKey?: string;
}
