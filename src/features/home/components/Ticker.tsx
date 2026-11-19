'use client';

import { useSiteConfig } from '@/features/catalog/hooks/useSiteConfig';

/** Offer strip — only shown if the Sheet has an `Offers` tab with rows. */
export function Ticker() {
  const { data } = useSiteConfig();
  const offers = data?.offers ?? [];
  if (!offers.length) return null;

  const items = [...offers, ...offers];
  return (
    <div className="ticker">
      <div className="jaali" />
      <div className="ticker-track">
        {items.map((o, i) => (
          <span key={i} aria-hidden={i >= offers.length}>{o}</span>
        ))}
      </div>
    </div>
  );
}
