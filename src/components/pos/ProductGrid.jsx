import { PackageSearch } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { ProductListItem } from './ProductListItem';
import { ProductGridSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

export function ProductGrid({ status, error, products, cartQuantities, onSelect, onRetry, hasQuery, view = 'grid' }) {
  if (status === 'loading') return <ProductGridSkeleton />;

  if (status === 'error') {
    return <ErrorState message={error?.message} onRetry={onRetry} />;
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title={hasQuery ? 'Product not found' : 'No products in this category'}
        description={
          hasQuery
            ? 'No product matched that name, SKU, or barcode. Try a different search.'
            : 'Products will appear here once available for this category.'
        }
      />
    );
  }

  if (view === 'list') {
    return (
      <div className="space-y-2">
        {products.map((p) => (
          <ProductListItem key={p.id} product={p} quantityInCart={cartQuantities[p.id] || 0} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} quantityInCart={cartQuantities[p.id] || 0} onSelect={onSelect} />
      ))}
    </div>
  );
}
