import 'server-only';
import { getGrid, getWorkbookVersion } from '@/data/workbook.server';
import type { ArtKind, Availability, CategoryDef, Product, ProductVariant } from '@/types/product';

/**
 * Builds the storefront catalogue from the Google Sheet.
 *
 * Tab "Products" — one row per pack size. The header row is found by
 * looking for the "Product ID" / "Product Name" cells, so the title and
 * instruction rows above the table (and any reordering of columns) are fine.
 *
 *   Product ID | Product Name (website) | English / Other Name | Category |
 *   Size | Unit | MRP (₹) | Selling Price (₹) | Discount % | Stock Qty |
 *   Availability | Show on Website | Short Description | Product Image | Notes
 *
 *  - Rows with the same Product Name become one product with several sizes.
 *  - "Show on Website" = No hides the row.
 *  - Availability comes from the Availability cell, or from Stock Qty if
 *    that cell is blank (0 = out, 1–10 = low, more = in stock).
 *  - Discount % is recomputed from MRP and Selling Price.
 *  - Notes is internal and never sent to the browser.
 *
 * Tab "Lists" — column "Categories" sets the order categories appear in.
 */

const PRODUCTS_TAB = 'Products';
const LISTS_TAB = 'Lists';
const LOW_STOCK_MAX = 10;

/** Column key -> how to recognise its header cell (lowercased, punctuation
 * stripped, matched as a prefix). */
const COLUMNS = {
  id: ['product id', 'id', 'sku'],
  name: ['product name', 'name'],
  alt: ['english', 'other name'],
  category: ['category'],
  size: ['size', 'pack size', 'weight'],
  unit: ['unit'],
  mrp: ['mrp'],
  price: ['selling price', 'price'],
  qty: ['stock qty', 'stock', 'qty'],
  availability: ['availability'],
  show: ['show on website', 'show'],
  desc: ['short description', 'description'],
} as const;

type ColumnKey = keyof typeof COLUMNS;
type ColumnMap = Partial<Record<ColumnKey, number>>;

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function num(v: string | undefined): number {
  const n = parseFloat((v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

function hash(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 99991;
  return h + 11;
}

function mapHeader(row: string[]): ColumnMap {
  const map: ColumnMap = {};
  row.forEach((cell, i) => {
    const h = norm(cell);
    if (!h) return;
    for (const key of Object.keys(COLUMNS) as ColumnKey[]) {
      if (map[key] !== undefined) continue;
      if (COLUMNS[key].some((alias) => h === alias || h.startsWith(alias + ' '))) {
        map[key] = i;
        return;
      }
    }
  });
  return map;
}

/** The header is the first row that has both a product-name and a price column. */
function findHeader(grid: string[][]): { index: number; cols: ColumnMap } | null {
  for (let i = 0; i < Math.min(grid.length, 30); i++) {
    const cols = mapHeader(grid[i] ?? []);
    if (cols.name !== undefined && cols.price !== undefined) return { index: i, cols };
  }
  return null;
}

function packLabel(size: number, unit: string): string {
  if (!Number.isFinite(size) || size <= 0) return unit || 'Pack';
  const n = String(Math.round(size * 1000) / 1000);
  if (!unit) return n;
  return /^(g|kg|ml|l)$/i.test(unit) ? `${n}${unit}` : `${n} ${unit}`;
}

function availability(cell: string, qty: number): Availability {
  const a = cell.toLowerCase();
  if (a.includes('out')) return 'out';
  if (a.includes('low')) return 'low';
  if (a.includes('in stock') || a === 'in' || a === 'yes') return 'in';
  if (Number.isFinite(qty)) return qty <= 0 ? 'out' : qty <= LOW_STOCK_MAX ? 'low' : 'in';
  return 'in';
}

/** The Sheet's starter rows end descriptions with a "(Edit this
 * description)" reminder — never show that to shoppers. */
function cleanDescription(s: string): string {
  return s.replace(/\(\s*edit this description\s*\)/gi, '').trim();
}

/** Picks an illustration from the product's names. First match wins, so
 * blends ("Cardamom Tea", "Dry Ginger Coffee") are checked before the
 * single ingredients. */
const ART_RULES: [RegExp, ArtKind][] = [
  [/\boil\b/, 'oil'],
  [/coffee beans?/, 'coffeebean'],
  [/coffee/, 'coffee'],
  [/tea dust|dust tea/, 'teadust'],
  [/\btea\b|chai/, 'tea'],
  [/(powder|podi|ground).*(cardamom|elaichi|elachi)|(cardamom|elaichi|elachi).*(powder|podi)|ground cardamom/, 'elaichip'],
  [/turmeric|haldi|manjal/, 'haldi'],
  [/pepper.*(powder|podi)|(powder|podi|ground).*pepper/, 'pepperp'],
  [/(ginger|chukku).*(powder|podi)|(powder|podi|ground).*ginger/, 'gingerp'],
  [/chilli.*(powder|podi)|chili powder|mulaku podi/, 'redk'],
  [/coriander.*(powder|podi)|malli podi/, 'dhania'],
  [/masala/, 'garam'],
  [/cardamom|elaichi|elachi|ellachi|elakka/, 'cardamom'],
  [/cinnamon|\bpatta\b/, 'bark'],
  [/pepper|kurumulaku/, 'pepper'],
  [/clove|grampoo/, 'clove'],
  [/star anise|thakkolam/, 'star'],
  [/nutmeg|jathika/, 'nutmeg'],
  [/\bmace\b|jathipathri/, 'mace'],
  [/kudampuli|garcinia|kokum/, 'kudampuli'],
  [/tamarind|\bpuli\b|valanpuli/, 'tamarind'],
  [/\bdates?\b|khajoor|eenthapazham/, 'date'],
  [/cashew|kaju/, 'cashew'],
  [/almond|badam/, 'almond'],
  [/pista/, 'pistachio'],
  [/walnut|akhrot/, 'walnut'],
  [/raisin|kishmish|munthiri/, 'raisin'],
  [/\bfig|anjeer/, 'fig'],
  [/apricot/, 'apricot'],
  [/bay leaf|tej patta/, 'bay'],
  [/chilli|chili|mulaku/, 'chilli'],
  [/cumin|fennel|jeera|mustard|seed/, 'seed'],
  [/powder|podi|ground/, 'garam'],
];

function pickArt(name: string, alt: string, category: string): ArtKind {
  const text = `${name} ${alt}`.toLowerCase();
  for (const [re, kind] of ART_RULES) if (re.test(text)) return kind;
  const cat = category.toLowerCase();
  if (cat.includes('powder')) return 'garam';
  if (cat.includes('nut') || cat.includes('fruit')) return 'almond';
  if (cat.includes('oil')) return 'oil';
  return 'seed';
}

function listedCategories(grid: string[][]): string[] {
  const header = grid[0] ?? [];
  const col = header.findIndex((c) => norm(c) === 'categories' || norm(c) === 'category');
  if (col < 0) return [];
  return grid
    .slice(1)
    .map((row) => (row[col] ?? '').trim())
    .filter(Boolean);
}

interface Catalog {
  products: Product[];
  categories: CategoryDef[];
  hay: Map<string, string>;
  maxPrice: number;
  forVersion: number;
}

const globalForCatalog = globalThis as unknown as { __catalogue?: Catalog };

async function buildCatalog(): Promise<Catalog> {
  const version = await getWorkbookVersion();
  if (globalForCatalog.__catalogue?.forVersion === version) {
    return globalForCatalog.__catalogue;
  }

  const [grid, lists] = await Promise.all([getGrid(PRODUCTS_TAB), getGrid(LISTS_TAB)]);
  const header = findHeader(grid);

  const byKey = new Map<string, Product>();
  const usedIds = new Set<string>();

  if (header) {
    const { cols } = header;
    const cell = (row: string[], key: ColumnKey): string => {
      const i = cols[key];
      return i === undefined ? '' : (row[i] ?? '').trim();
    };

    for (const row of grid.slice(header.index + 1)) {
      const name = cell(row, 'name');
      const price = Math.round(num(cell(row, 'price')));
      if (!name || !Number.isFinite(price) || price <= 0) continue;
      if (/^(no|n|false|0|hide|hidden)$/i.test(cell(row, 'show'))) continue;

      const rawMrp = Math.round(num(cell(row, 'mrp')));
      const mrp = Number.isFinite(rawMrp) && rawMrp > price ? rawMrp : price;
      const size = num(cell(row, 'size'));
      const unit = cell(row, 'unit');
      const category = cell(row, 'category') || 'Other';
      const alt = cell(row, 'alt');
      const sku = cell(row, 'id');

      const variant: ProductVariant = {
        sku,
        w: packLabel(size, unit),
        size: Number.isFinite(size) ? size : 0,
        unit,
        mrp,
        p: price,
        avail: availability(cell(row, 'availability'), num(cell(row, 'qty'))),
      };

      const key = name.toLowerCase();
      const existing = byKey.get(key);
      if (existing) {
        existing.vars.push(variant);
        continue;
      }

      let id = slug(name) || slug(sku) || `item-${byKey.size + 1}`;
      while (usedIds.has(id)) id += '-x';
      usedIds.add(id);

      byKey.set(key, {
        id,
        name,
        alt: alt.toLowerCase() === name.toLowerCase() ? '' : alt,
        desc: cleanDescription(cell(row, 'desc')),
        cat: slug(category) || 'other',
        catName: category,
        art: pickArt(name, alt, category),
        vars: [variant],
        seed: hash(id),
        order: byKey.size,
        stock: true,
      });
    }
  } else if (grid.length) {
    // eslint-disable-next-line no-console
    console.error(
      `[catalogue] the "${PRODUCTS_TAB}" tab has no recognisable header row (need "Product Name" and "Selling Price" columns)`
    );
  }

  const products = [...byKey.values()];
  for (const p of products) {
    p.vars.sort((a, b) => a.p - b.p);
    p.stock = p.vars.some((v) => v.avail !== 'out');
  }

  // Categories: Lists-tab order first, then any category only seen on products.
  const order = listedCategories(lists).map((n) => slug(n));
  const categories: CategoryDef[] = [];
  for (const p of products) {
    const found = categories.find((c) => c.k === p.cat);
    if (found) found.count += 1;
    else categories.push({ k: p.cat, n: p.catName, art: p.art, count: 1 });
  }
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  categories.sort((a, b) => rank(a.k) - rank(b.k));

  const hay = new Map<string, string>();
  for (const p of products) {
    hay.set(
      p.id,
      `${p.name} ${p.alt} ${p.catName} ${p.desc} ${p.vars.map((v) => `${v.w} ${v.sku}`).join(' ')}`.toLowerCase()
    );
  }

  const top = Math.max(0, ...products.map((p) => p.vars[0]?.p ?? 0));
  const catalog: Catalog = {
    products,
    categories,
    hay,
    maxPrice: Math.max(100, Math.ceil(top / 50) * 50),
    forVersion: version,
  };
  globalForCatalog.__catalogue = catalog;
  return catalog;
}

export interface CatalogSnapshot {
  products: Product[];
  categories: CategoryDef[];
  /** Slider ceiling: the highest "from" price, rounded up to ₹50. */
  maxPrice: number;
  version: number;
  searchHay: (p: Product) => string;
}

export async function getCatalogSnapshot(): Promise<CatalogSnapshot> {
  const catalog = await buildCatalog();
  return {
    products: catalog.products,
    categories: catalog.categories,
    maxPrice: catalog.maxPrice,
    version: catalog.forVersion,
    searchHay: (p) => catalog.hay.get(p.id) ?? p.name.toLowerCase(),
  };
}
