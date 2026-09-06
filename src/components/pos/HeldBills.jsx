import { Archive, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateTime } from '@/utils/currency';

export function HeldBills({ open, onClose, status, error, bills, onResume, onDelete, onRetry }) {
  return (
    <Modal open={open} onClose={onClose} title="Held Bills">
      {status === 'loading' && (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-egg-500" />
        </div>
      )}

      {status === 'error' && <ErrorState message={error?.message} onRetry={onRetry} />}

      {status === 'success' && bills.length === 0 && (
        <EmptyState icon={Archive} title="No held bills" description="Bills you hold will appear here so you can resume them later." />
      )}

      {status === 'success' && bills.length > 0 && (
        <ul className="divide-y divide-charcoal-900/6">
          {bills.map((bill) => (
            <li key={bill.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal-900">{bill.label}</p>
                <p className="text-xs text-charcoal-400">
                  {bill.customer?.name || 'Walk-in'} • {bill.items.length} item{bill.items.length !== 1 ? 's' : ''} •{' '}
                  {formatDateTime(bill.heldAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold text-charcoal-900">{formatCurrency(bill.amount)}</span>
                <Button size="sm" variant="outline" onClick={() => onResume(bill)}>
                  Resume
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(bill.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
