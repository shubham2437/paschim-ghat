import type { ArtKind } from '@/types/product';

interface ProductArtProps {
  kind: ArtKind;
  seed: number;
  w?: number;
  h?: number;
  className?: string;
  /** Describes the product for search engines / screen readers. Omit for purely decorative art. */
  alt?: string;
  /** Set on the first, above-the-fold image only. */
  priority?: boolean;
  /** Above-the-fold but not the LCP image: load immediately without high fetch priority. */
  eager?: boolean;
}

/**
 * Product art is rendered on the server by the /art route and delivered as a
 * cached SVG image — no generator code ships in the client bundle and the
 * <img> is present in the server-rendered HTML.
 */
export function ProductArt({ kind, seed, w = 420, h = 320, className, alt = '', priority = false, eager = false }: ProductArtProps) {
  const src = `/art?kind=${kind}&seed=${seed}&w=${w}&h=${h}`;
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG is already optimal; next/image does not transform SVG */}
      <img
        src={src}
        alt={alt}
        width={w}
        height={h}
        decoding="async"
        loading={priority || eager ? 'eager' : 'lazy'}
        {...(priority ? { fetchPriority: 'high' as const } : {})}
        style={{ width: '100%', height: 'auto' }}
      />
    </div>
  );
}
