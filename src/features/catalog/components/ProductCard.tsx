'use client';

import { ProductArt } from '@/features/catalog/components/ProductArt';
import { useCatalogFilterStore } from '@/features/catalog/store/catalog-filter-store';
import { lineKey, useCartStore } from '@/features/cart/store/cart-store';
import { useUiStore } from '@/components/ui/ui-store';
import { useToast } from '@/components/ui/toast-provider';
import { money, off, perUnit, resolveVariantIndex } from '@/lib/utils/format';
import type { ProductDTO } from '@/types/product';

export function ProductCard({ product }: { product: ProductDTO }) {
  const chosen = useCatalogFilterStore((s) => s.selectedVariant[product.id]);
  const selectVariant = useCatalogFilterStore((s) => s.selectVariant);
  const lines = useCartStore((s) => s.lines);
  const addProduct = useCartStore((s) => s.addProduct);
  const openProduct = useUiStore((s) => s.openProduct);
  const { toast } = useToast();

  const selectedIndex = resolveVariantIndex(product, chosen);
  const variant = product.vars[selectedIndex]!;
  const qty = lines[lineKey(product, variant)]?.qty ?? 0;
  const discount = off(variant);
  const unitPrice = perUnit(variant);
  const soldOut = variant.avail === 'out';

  return (
    <article className={`card ${product.stock ? '' : 'oos'}`}>
      <div
        className="card-art"
        role="button"
        tabIndex={0}
        aria-label={`View ${product.name}`}
        onClick={() => openProduct(product.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProduct(product.id);
          }
        }}
      >
        <div className="badges">
          {discount > 0 && <span className="bdg off">{discount}% off</span>}
          {variant.avail === 'low' && <span className="bdg new">Low stock</span>}
          {soldOut && <span className="bdg" style={{ background: '#6F6A61' }}>Sold out</span>}
        </div>
        <ProductArt kind={product.art} seed={product.seed} />
        <div className="quick">Quick view</div>
      </div>
      <div className="card-bd">
        <span className="card-cat">{product.catName}</span>
        <h3>{product.name}</h3>
        {product.alt && <p className="card-alt">{product.alt}</p>}
        <div className="vars">
          {product.vars.map((v, i) => (
            <button
              key={`${v.sku}-${v.w}-${i}`}
              className={`var ${i === selectedIndex ? 'on' : ''} ${v.avail === 'out' ? 'out' : ''}`}
              aria-pressed={i === selectedIndex}
              onClick={() => selectVariant(product.id, i)}
            >
              {v.w}
            </button>
          ))}
        </div>
        <div className="price">
          <b>{money(variant.p)}</b>
          {variant.mrp > variant.p && <s>{money(variant.mrp)}</s>}
          {variant.mrp > variant.p && <span className="pc">Save {money(variant.mrp - variant.p)}</span>}
          {unitPrice && <span className="per">· {unitPrice}</span>}
        </div>
        <div className="add">
          {soldOut ? (
            <button className="btn btn-ghost btn-sm btn-block" disabled style={{ opacity: 0.55, cursor: 'not-allowed' }}>
              Out of stock
            </button>
          ) : qty ? (
            <div className="add-row">
              <div className="qty">
                <button aria-label="Remove one" onClick={() => addProduct(product, variant, -1)}>−</button>
                <span>{qty}</span>
                <button aria-label="Add one" onClick={() => addProduct(product, variant, 1)}>+</button>
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>in basket</span>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm btn-block"
              onClick={() => {
                addProduct(product, variant, 1);
                toast(`${product.name} (${variant.w}) added`);
              }}
            >
              Add to basket
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
