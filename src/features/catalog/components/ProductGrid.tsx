import { ProductCard } from '@/features/catalog/components/ProductCard';
import type { ProductDTO } from '@/types/product';

export function ProductGrid({ products }: { products: ProductDTO[] }) {
  return (
    <div className="grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
