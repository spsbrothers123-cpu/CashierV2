import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateTime } from '@/utils/currency';
import { cn } from '@/utils/cn';

export function ClosedSessionSummary({ session, onStartNew }) {
  const difference = session?.difference ?? 0;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-success-600/12 text-success-600">
          <CheckCircle2 className="size-6" aria-hidden />
        </div>
        <h1 className="font-display text-xl font-bold text-charcoal-900">Session Closed</h1>
      </div>

      <div className="rounded-card border border-charcoal-900/8 bg-surface-white p-5 shadow-soft">
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Opening Cash</dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(session?.openingCash)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Closing Cash</dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(session?.actualClosingCash)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Sales</dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(session?.sales)}</dd>
          </div>
          <div className="flex justify-between border-t border-charcoal-900/8 pt-2.5">
            <dt className="font-medium text-charcoal-700">Difference</dt>
            <dd
              className={cn(
                'font-semibold',
                difference === 0 ? 'text-success-600' : difference > 0 ? 'text-warning-600' : 'text-danger-600'
              )}
            >
              {difference > 0 ? '+' : ''}
              {formatCurrency(difference)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Closing Time</dt>
            <dd className="font-medium text-charcoal-900">{formatDateTime(session?.closedAt)}</dd>
          </div>
        </dl>

        <Button className="mt-5 w-full" size="lg" onClick={onStartNew}>
          Start New Session
        </Button>
      </div>
    </div>
  );
}
