import { useEffect, useState } from 'react';
import { UserRound, UserPlus, Search, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatCurrency } from '@/utils/currency';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/components/ui/Toast';
import { searchCustomers } from '@/api/customers';
import { AddCustomerModal } from '@/components/pos/AddCustomerModal';

export function CustomerSelector({ open, onClose, onSelect, selectedCustomer }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [status, setStatus] = useState('idle');
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus('loading');
    searchCustomers(debouncedQuery)
      .then((res) => {
        if (cancelled) return;
        setCustomers(res);
        setStatus('success');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  // A customer just created here goes straight into the visible list (and,
  // since the underlying search already persists it — see api/customers.js —
  // it stays findable on future searches too) and is attached to the current
  // bill right away, since that's the reason a cashier adds one mid-sale.
  function handleCustomerCreated(customer) {
    setCustomers((prev) => [customer, ...prev]);
    push(`${customer.name} added as a new customer.`, 'success');
    onSelect(customer);
  }

  return (
    <Modal open={open} onClose={onClose} title="Select Customer">
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-charcoal-300" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or phone…"
            className="h-11 w-full rounded-[10px] border border-charcoal-900/12 bg-surface-white pl-10 pr-3 text-sm outline-none focus:border-egg-500"
          />
        </div>
        <Button type="button" variant="outline" size="md" onClick={() => setAddOpen(true)} className="shrink-0 gap-1.5 px-3.5">
          <UserPlus className="size-4" aria-hidden />
          <span className="hidden sm:inline">Add Customer</span>
        </Button>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {status === 'loading' && (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-egg-500" />
          </div>
        )}

        {status === 'error' && <ErrorState message={error?.message} />}

        {status === 'success' && customers.length === 0 && (
          <EmptyState
            icon={UserRound}
            title="No customers found"
            description="Try a different name or phone number."
            action={
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
                <UserPlus className="size-4" aria-hidden />
                Add Customer
              </Button>
            }
          />
        )}

        {status === 'success' &&
          customers.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left hover:bg-charcoal-900/4"
            >
              <div>
                <p className="text-sm font-medium text-charcoal-900">{c.name}</p>
                <p className="text-xs text-charcoal-400">{c.phone}</p>
              </div>
              {typeof c.creditBalance === 'number' && c.creditBalance > 0 && (
                <span className="text-xs font-medium text-warning-600">
                  Credit: {formatCurrency(c.creditBalance)}
                </span>
              )}
            </button>
          ))}
      </div>

      <div className="mt-4 flex gap-2 border-t border-charcoal-900/8 pt-4">
        {selectedCustomer && (
          <Button variant="outline" className="flex-1" onClick={() => onSelect(null)}>
            Remove customer
          </Button>
        )}
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          Continue without customer
        </Button>
      </div>

      <AddCustomerModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={handleCustomerCreated} />
    </Modal>
  );
}
