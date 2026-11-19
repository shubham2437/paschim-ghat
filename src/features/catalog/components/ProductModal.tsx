'use client';

import { useUiStore } from '@/components/ui/ui-store';
import { useCatalogData } from '@/features/catalog/hooks/useCatalogData';
import { useCatalogFilterStore } from '@/features/catalog/store/catalog-filter-store';
import { useSiteConfig } from '@/features/catalog/hooks/useSiteConfig';
import { useCartStore } from '@/features/cart/store/cart-store';
import { useToast } from '@/components/ui/toast-provider';
import { ProductArt } from '@/features/catalog/components/ProductArt';
import { money, off, perUnit, resolveVariantIndex } from '@/lib/utils/format';

const AVAILABILITY = { in: 'In stock', low: 'Low stock', out: 'Out of stock' } as const;

export function ProductModal() {
  const activeId = useUiStore((s) => s.activeProductId);
  const closeAll = useUiStore((s) => s.closeAll);
  const { data } = useCatalogData();
  const { data: site } = useSiteConfig();
  const selectedVariant = useCatalogFilterStore((s) => s.selectedVariant);
  const selectVariant = useCatalogFilterStore((s) => s.selectVariant);
  const addProduct = useCartStore((s) => s.addProduct);
  const { toast } = useToast();

  const product = data?.products.find((p) => p.id === activeId) ?? null;

  if (!product) return null;

  const vi = resolveVariantIndex(product, selectedVariant[product.id]);
  const v = product.vars[vi]!;
  const soldOut = v.avail === 'out';
  const unitPrice = perUnit(v);
  const discount = off(v);
  const freeShipAbove = site?.settings.free_shipping_above ?? 0;

  return (
    <div className="modal on" role="dialog" aria-modal="true" aria-label={product.name}>
      <div className="modal-in">
        <button className="closeX" aria-label="Close" onClick={closeAll}>✕</button>
        <div className="pd">
          <div className="pd-art">
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line)' }}>
              <ProductArt kind={product.art} seed={product.seed} w={520} h={400} />
            </div>
          </div>
          <div className="pd-bd">
            <span className="card-cat">{product.catName}</span>
            <h2>{product.name}</h2>
            {product.alt && <p style={{ color: 'var(--muted)', margin: 0 }}>{product.alt}</p>}
            <div className="vars" style={{ marginTop: 14 }}>
              {product.vars.map((x, i) => (
                <button
                  key={`${x.sku}-${x.w}-${i}`}
                  className={`var ${i === vi ? 'on' : ''} ${x.avail === 'out' ? 'out' : ''}`}
                  aria-pressed={i === vi}
                  onClick={() => selectVariant(product.id, i)}
                >
                  {x.w}
                </button>
              ))}
            </div>
            <div className="price" style={{ marginTop: 10 }}>
              <b style={{ fontSize: 26 }}>{money(v.p)}</b>
              {v.mrp > v.p && <s>{money(v.mrp)}</s>}
              {discount > 0 && <span className="pc">{discount}% off</span>}
              {unitPrice && <span className="per">· {unitPrice}</span>}
            </div>
            {freeShipAbove > 0 && (
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>
                Free delivery above {money(freeShipAbove)}.
              </p>
            )}
            {product.desc && <p className="pd-desc">{product.desc}</p>}
            <div className="spec">
              <div><small>Category</small><b>{product.catName}</b></div>
              <div><small>Pack size</small><b>{v.w}</b></div>
              <div><small>Availability</small><b>{AVAILABILITY[v.avail]}</b></div>
              {v.sku && <div><small>Product ID</small><b>{v.sku}</b></div>}
            </div>
            <div className="add-row" style={{ marginTop: 16 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={soldOut}
                onClick={() => {
                  addProduct(product, v, 1);
                  toast(`${product.name} (${v.w}) added`);
                }}
              >
                {soldOut ? 'Out of stock' : 'Add to basket'}
              </button>
              <button
                className="btn btn-gold"
                style={{ flex: 1 }}
                disabled={soldOut}
                onClick={() => {
                  addProduct(product, v, 1);
                  closeAll();
                  useUiStore.getState().openCart();
                }}
              >
                Buy now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
