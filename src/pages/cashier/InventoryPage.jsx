import { useCallback, useEffect, useState } from 'react';
import { Package, PackageSearch } from 'lucide-react';
import { SearchBar } from '@/components/pos/SearchBar';
import { CategoryFilter } from '@/components/pos/CategoryFilter';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { searchProducts, getCategories } from '@/api/products';
import { formatCurrency } from '@/utils/currency';

function stockStatus(stock) {
  if (stock <= 0) return { label: 'Out of Stock', tone: 'danger' };
  if (stock <= 5) return { label: 'Low Stock', tone: 'warning' };
  return { label: 'In Stock', tone: 'success' };
}

export function InventoryPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 350);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading');
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const load = useCallback(() => {
    setStatus('loading');
    searchProducts({ query: debouncedQuery, category })
      .then((res) => {
        setProducts(res);
        setStatus('success');
      })
      .catch((err) => {
        setError(err);
        setStatus('error');
      });
  }, [debouncedQuery, category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2.5">
        <Package className="size-5 text-charcoal-700" aria-hidden />
        <h1 className="font-display text-xl font-bold text-charcoal-900 sm:text-2xl">Inventory</h1>
      </div>
      <p className="mt-1 text-sm text-charcoal-500">
        Stock levels are view-only here. Adding, editing, or removing products requires shop-admin access.
      </p>

      <div className="mt-5 space-y-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by name, SKU, or barcode…" />
        <CategoryFilter categories={categories} active={category} onChange={setCategory} />
      </div>

      <div className="mt-5 overflow-hidden rounded-card border border-charcoal-900/8 bg-surface-white">
        {status === 'loading' && (
          <div className="divide-y divide-charcoal-900/6 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/6" />
              </div>
            ))}
          </div>
        )}

        {status === 'error' && <ErrorState message={error?.message} onRetry={load} />}

        {status === 'success' && products.length === 0 && (
          <EmptyState
            icon={PackageSearch}
            title="No products found"
            description="Try a different search term or category."
          />
        )}

        {status === 'success' && products.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-charcoal-900/4 text-xs text-charcoal-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Product</th>
                  <th className="px-4 py-2.5 text-left font-medium">SKU</th>
                  <th className="px-4 py-2.5 text-right font-medium">Stock</th>
                  <th className="px-4 py-2.5 text-left font-medium">Unit</th>
                  <th className="px-4 py-2.5 text-right font-medium">Price</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-900/6">
                {products.map((p) => {
                  const s = stockStatus(p.stock);
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium text-charcoal-900">{p.name}</td>
                      <td className="px-4 py-3 text-charcoal-500">{p.sku || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-charcoal-700">{p.stock}</td>
                      <td className="px-4 py-3 text-charcoal-500">{p.unit}</td>
                      <td className="px-4 py-3 text-right font-medium text-charcoal-900">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
