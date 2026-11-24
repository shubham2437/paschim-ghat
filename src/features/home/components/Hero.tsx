'use client';

import { Fragment } from 'react';
import { ProductArt } from '@/features/catalog/components/ProductArt';
import { useSiteConfig } from '@/features/catalog/hooks/useSiteConfig';
import { useCatalogData } from '@/features/catalog/hooks/useCatalogData';
import { useUiStore } from '@/components/ui/ui-store';
import type { ArtKind } from '@/types/product';

/** Renders `*word*` segments as gold italic <em>, everything else as plain text. */
function withEmphasis(text: string) {
  const parts = text.split(/\*(.+?)\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>
  );
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const FALLBACK_ART: ArtKind[] = ['cardamom', 'pepper', 'tea'];

export function Hero() {
  const { data: site } = useSiteConfig();
  const { data: catalog } = useCatalogData();
  const openWaModal = useUiStore((s) => s.openWaModal);
  const s = site?.settings;

  const categories = catalog?.categories ?? [];
  // If the Settings tab gives no lead text, describe what the Sheet actually lists.
  const lead =
    s?.hero_lead ||
    (categories.length
      ? `${joinNames(categories.map((c) => c.n))} — pick your pack size and order on WhatsApp.`
      : 'Pick your pack size and order on WhatsApp.');

  // Three distinct illustrations taken from the live categories.
  const kinds = [...new Set([...categories.map((c) => c.art), ...FALLBACK_ART])].slice(0, 3) as ArtKind[];

  return (
    <div className="hero" id="top">
      <div className="jaali" />
      <div className="wrap hero-in">
        <div>
          <h1>
            {withEmphasis(s?.hero_line1 ?? '')}
            <br />
            {withEmphasis(s?.hero_line2 ?? '')}
          </h1>
          <p className="lead">{lead}</p>
          <div className="hero-cta">
            <a className="btn btn-gold" href="#shop">
              Shop {catalog ? `all ${catalog.catalogSize} products` : 'now'} →
            </a>
            <button
              className="btn btn-ghost"
              style={{ color: '#F3E7CE', borderColor: 'rgba(235,208,138,.4)' }}
              onClick={openWaModal}
            >
              ✆ Order on WhatsApp
            </button>
          </div>
          {catalog && catalog.catalogSize > 0 && (
            <div className="hero-stats">
              <div><b>{catalog.catalogSize}</b><span>PRODUCTS</span></div>
              <div><b>{categories.length}</b><span>CATEGORIES</span></div>
            </div>
          )}
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="fl f1"><ProductArt kind={kinds[0]!} seed={31} w={460} h={320} priority /></div>
          <div className="fl f2"><ProductArt kind={kinds[1]!} seed={77} w={420} h={300} /></div>
          <div className="fl f3"><ProductArt kind={kinds[2]!} seed={53} w={420} h={300} /></div>
          {s?.hero_badge && <span className="hero-badge">{s.hero_badge}</span>}
        </div>
      </div>
    </div>
  );
}
