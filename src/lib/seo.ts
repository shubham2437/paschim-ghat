/** Canonical public origin, e.g. https://pachimghat.com (no trailing slash). */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

/** Escape `<` so JSON-LD can never close its own <script> tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Product names (as sold) and their English names, plus categories. */
const PRODUCT_KEYWORDS: Array<[string, string]> = [
  ['Cardamom', 'Green Cardamom (Elaichi)'],
  ['Cardamom powder', 'Ground Cardamom'],
  ['Patta nadan', 'Cinnamon Kerala local'],
  ['Patta Churulan', 'Cinnamon Quills'],
  ['Pepper', 'Black Pepper'],
  ['Grampoo', 'Cloves'],
  ['Coffee powder', 'Coffee Powder'],
  ['Masala coffee', 'Masala Coffee'],
  ['Chukku coffee', 'Dry Ginger Coffee'],
  ['Elachi coffee', 'Cardamom Coffee'],
  ['Tea gold (B.O.P)', 'Tea Gold Broken Orange Pekoe'],
  ['Tea Dust SRB', 'Tea Dust SRB grade'],
  ['Elachi tea', 'Cardamom Tea'],
  ['Green tea', 'Green Tea'],
  ['Turmeric powder', 'Turmeric Powder'],
  ['Thakkolam', 'Star Anise'],
  ['Kudampuli', 'Malabar Tamarind (Garcinia)'],
  ['Valanpuli', 'Tamarind'],
  ['Jathika', 'Nutmeg'],
  ['Jathipathri', 'Mace'],
  ['Pepper powder', 'Black Pepper Powder'],
  ['Chukku podi', 'Dry Ginger Powder'],
  ['Masala tea', 'Masala Tea'],
  ['Ellachi', 'Cardamom'],
  ['Dates', 'Dates'],
  ['Cashews', 'Cashew Nuts W320'],
  ['Almond', 'Almonds'],
  ['Coconut oil', 'Pure Coconut Oil'],
  ['Pistachios', 'Salted Pistachios'],
  ['Raisins', 'Golden Raisins (Kishmish)'],
];

const CATEGORY_KEYWORDS = ['Spices', 'Spice Powders', 'Coffee', 'Tea', 'Souring Agents', 'Dry Fruits & Nuts', 'Oils'];

/** De-duplicated (case-insensitive) keyword list: static catalogue terms + live Sheet categories. */
export function seoKeywords(extra: string[] = []): string[] {
  const seen = new Set<string>();
  return [...PRODUCT_KEYWORDS.flat(), ...CATEGORY_KEYWORDS, ...extra, 'Kerala spices', 'Western Ghats', 'buy on WhatsApp']
    .filter((k) => {
      const key = k.toLowerCase();
      if (!k || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
