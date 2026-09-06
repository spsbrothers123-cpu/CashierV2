import { AlertTriangle, UserRound } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';

export function CreditPaymentFields({ customer, grandTotal, onSelectCustomer }) {
  if (!customer) {
    return (
      <div className="rounded-[10px] border border-warning-500/30 bg-warning-500/10 p-3.5">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-charcoal-900">A customer is required for credit billing</p>
            <p className="mt-0.5 text-xs text-charcoal-500">Select a customer before completing this payment.</p>
          </div>
        </div>
        <button
          onClick={onSelectCustomer}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-charcoal-900/15 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-charcoal-900/5"
        >
          <UserRound className="size-4" /> Select Customer
        </button>
      </div>
    );
  }

  const existingCredit = customer.creditBalance || 0;
  const newCredit = existingCredit + grandTotal;
  const overLimit = typeof customer.creditLimit === 'number' && newCredit > customer.creditLimit;

  return (
    <div className="rounded-[10px] border border-charcoal-900/10 p-3.5">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-charcoal-500">Customer</dt>
          <dd className="font-medium text-charcoal-900">{customer.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-charcoal-500">Existing Credit</dt>
          <dd className="font-medium text-charcoal-900">{formatCurrency(existingCredit)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-charcoal-500">New Credit (after this bill)</dt>
          <dd className={overLimit ? 'font-semibold text-danger-600' : 'font-medium text-charcoal-900'}>
            {formatCurrency(newCredit)}
          </dd>
        </div>
        {typeof customer.creditLimit === 'number' && (
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Credit Limit</dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(customer.creditLimit)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-warning-500/10 px-3 py-2.5 text-xs text-warning-600">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          This bill will be added to {customer.name}&apos;s outstanding credit
          {overLimit ? ' and exceeds their credit limit.' : '.'}
        </span>
      </div>
    </div>
  );
}
