import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateTime } from '@/utils/currency';

export function SessionCard({ session, cashier, onCloseSession }) {
  const isActive = session?.status === 'active';

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-success-600/12 text-success-600">
          <CheckCircle2 className="size-6" aria-hidden />
        </div>
        <h1 className="font-display text-xl font-bold text-charcoal-900">Current Session</h1>
        <Badge tone={isActive ? 'success' : 'neutral'} className="mt-2">
          {isActive ? 'Active' : session?.status || 'Unknown'}
        </Badge>
      </div>

      <div className="rounded-card border border-charcoal-900/8 bg-surface-white p-5 shadow-soft">
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Cashier</dt>
            <dd className="font-medium text-charcoal-900">{cashier?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Shop</dt>
            <dd className="font-medium text-charcoal-900">{cashier?.shop?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Started</dt>
            <dd className="font-medium text-charcoal-900">{formatDateTime(session?.startedAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Opening Cash</dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(session?.openingCash)}</dd>
          </div>
        </dl>

        <dl className="mt-4 space-y-2 rounded-[10px] bg-charcoal-900/4 p-3.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Sales</dt>
            <dd className="font-semibold text-charcoal-900">{formatCurrency(session?.sales)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Cash Sales</dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(session?.cashSales)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">UPI</dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(session?.upiSales)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Card</dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(session?.cardSales)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Credit</dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(session?.creditSales)}</dd>
          </div>
          <div className="flex justify-between border-t border-charcoal-900/8 pt-2">
            <dt className="font-medium text-charcoal-700">Expected Cash</dt>
            <dd className="font-semibold text-charcoal-900">{formatCurrency(session?.expectedCash)}</dd>
          </div>
        </dl>

        {isActive && (
          <Button variant="dark" className="mt-4 w-full" onClick={onCloseSession}>
            Close Session
          </Button>
        )}
      </div>
    </div>
  );
}
