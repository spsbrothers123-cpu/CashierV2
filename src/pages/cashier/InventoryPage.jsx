import { useCallback, useEffect, useRef, useState } from 'react';
import { Package, PackageSearch, RefreshCw } from 'lucide-react';
import { SearchBar } from '@/components/pos/SearchBar';
import { CategoryFilter } from '@/components/pos/CategoryFilter';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { searchProducts, getCategories } from '@/api/products';
import { formatCurrency } from '@/utils/currency';
import { getStockState, STOCK_TONE } from '@/utils/stockStatus';
import { useAuthStore } from '@/store/authStore';

const STOCK_LABEL = { out: 'Out of Stock', low: 'Low Stock', in: 'In Stock' };

export function InventoryPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 350);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading');
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // Branch name is shown only when the authenticated session already carries it.
  const branchName = useAuthStore((st) => st.cashier?.shop?.name);
  // Only the newest product request may update the list (see load).
  const requestId = useRef(0);
  const inFlight = useRef(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // `silent` refreshes keep the current list on screen (no skeleton flash) and
  // keep it if the refresh fails; the initial/filter load shows the full states.
  const load = useCallback(
    ({ silent = false } = {}) => {
      // A slower, older response must never overwrite a newer one.
      const id = ++requestId.current;
      inFlight.current = true;
      if (silent) setRefreshing(true);
      else setStatus('loading');
      return searchProducts({ query: debouncedQuery, category })
        .then((res) => {
          if (id !== requestId.current) return;
          setProducts(res);
          setStatus('success');
        })
        .catch((err) => {
          if (id !== requestId.current) return;
          if (silent) return;
          setError(err);
          setStatus('error');
        })
        .finally(() => {
          if (id !== requestId.current) return;
          inFlight.current = false;
          setRefreshing(false);
        });
    },
    [debouncedQuery, category]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Always call the latest load (current search/category) from event handlers.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // Stock can change while this tab is in the background (sales on another
  // device, Admin adjustments). Refetch when the tab becomes visible/focused.
  useEffect(() => {
    function refreshIfIdle() {
      if (document.visibilityState === 'hidden' || inFlight.current) return;
      loadRef.current({ silent: true });
    }
    document.addEventListener('visibilitychange', refreshIfIdle);
    window.addEventListener('focus', refreshIfIdle);
    return () => {
      document.removeEventListener('visibilitychange', refreshIfIdle);
      window.removeEventListener('focus', refreshIfIdle);
      // Drop any response that lands after unmount.
      requestId.current += 1;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Package className="size-5 text-charcoal-700" aria-hidden />
          <h1 className="font-display text-xl font-bold text-charcoal-900 sm:text-2xl">Inventory</h1>
        </div>
        <button
          type="button"
          onClick={() => load({ silent: true })}
          disabled={refreshing || status === 'loading'}
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-charcoal-900/10 px-3 text-sm font-medium text-charcoal-700 transition-colors hover:bg-charcoal-900/4 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          Refresh
        </button>
      </div>
      {branchName && <p className="mt-1 text-sm font-medium text-charcoal-700">{branchName}</p>}
      <p className="mt-1 text-sm text-charcoal-500">
        Stock levels are view-only here. Products and stock are managed by the central Admin.
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
                  const state = getStockState(p);
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
                        <Badge tone={STOCK_TONE[state]}>{STOCK_LABEL[state]}</Badge>
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
