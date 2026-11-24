/** Illustration styles understood by the procedural product art
 * (src/features/catalog/product-art.ts). Picked automatically from the
 * product's name — see pickArt() in src/data/catalog.server.ts. */
export const ART_KINDS = [
  'almond',
  'mamra',
  'cashew',
  'pistachio',
  'walnut',
  'raisin',
  'currant',
  'fig',
  'date',
  'apricot',
  'makhana',
  'pepper',
  'cardamom',
  'clove',
  'seed',
  'chilli',
  'star',
  'bark',
  'bay',
  'pumpkinseed',
  'hazel',
  'chilgoza',
  'nutmeg',
  'mace',
  'tamarind',
  'kudampuli',
  'tea',
  'coffeebean',
  'redk',
  'redg',
  'haldi',
  'dhania',
  'garam',
  'chole',
  'biryani',
  'chaat',
  'kking',
  'hing',
  'kesar',
  'pepperp',
  'gingerp',
  'elaichip',
  'coffee',
  'teadust',
  'oil',
] as const;

export type ArtKind = (typeof ART_KINDS)[number];

export type Availability = 'in' | 'low' | 'out';

/** One row of the Sheet's Products tab = one pack size of a product. */
export interface ProductVariant {
  /** Product ID cell of that row (e.g. P005). */
  sku: string;
  /** Pack label built from Size + Unit, e.g. "250g", "1L". */
  w: string;
  size: number;
  unit: string;
  mrp: number;
  /** Selling price. */
  p: number;
  avail: Availability;
}

/** Rows that share a Product Name are grouped into one product with
 * several pack sizes. */
export interface Product {
  id: string;
  /** "Product Name (website)" */
  name: string;
  /** "English / Other Name" */
  alt: string;
  /** "Short Description" */
  desc: string;
  /** Category key (slug of the Category cell). */
  cat: string;
  /** Category display name, exactly as typed in the Sheet. */
  catName: string;
  art: ArtKind;
  vars: ProductVariant[];
  /** Stable per-product seed for the illustration. */
  seed: number;
  /** Position in the Sheet — the default ("Featured") sort order. */
  order: number;
  /** True if at least one pack size is in stock. */
  stock: boolean;
}

/** Product shape as returned by /api/products — includes a precomputed
 * lowercase search blob. */
export interface ProductDTO extends Product {
  hay: string;
}

export interface CategoryDef {
  k: string;
  n: string;
  art: ArtKind;
  count: number;
}
