import { art } from '@/features/catalog/product-art';
import { ART_KINDS, type ArtKind } from '@/types/product';

export const runtime = 'nodejs';

const KINDS = new Set<string>(ART_KINDS);

function dim(v: string | null, fallback: number): number {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? Math.min(1200, Math.max(40, n)) : fallback;
}

/**
 * Product illustrations are rendered on the server and delivered as real,
 * long-cached SVG images (`<img src="/art?kind=almond&seed=7">`) instead of
 * being generated in the browser. Output is a pure function of the query, so
 * it is safe to cache forever at the edge and in the browser.
 */
export function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const kind = q.get('kind') ?? '';
  if (!KINDS.has(kind)) return new Response('Unknown art kind', { status: 400 });

  const seed = Number.parseInt(q.get('seed') ?? '', 10);
  const svg = art(kind as ArtKind, Number.isFinite(seed) ? Math.abs(seed) % 1_000_000 : 7, dim(q.get('w'), 420), dim(q.get('h'), 320));

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
