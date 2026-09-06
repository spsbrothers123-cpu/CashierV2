import { formatCurrency } from '@/utils/currency';

export function ReferencePaymentFields({ method, grandTotal, reference, onReferenceChange }) {
  const label = method === 'card' ? 'Card' : 'UPI';

  return (
    <div className="rounded-[10px] border border-charcoal-900/10 p-3.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-charcoal-500">Amount</span>
        <span className="font-semibold text-charcoal-900">{formatCurrency(grandTotal)}</span>
      </div>

      <label htmlFor={`${method}-reference`} className="mb-1.5 mt-3 block text-sm font-medium text-charcoal-800">
        {label} reference / transaction ID
        <span className="ml-1 font-normal text-charcoal-300">(optional)</span>
      </label>
      <input
        id={`${method}-reference`}
        type="text"
        value={reference}
        onChange={(e) => onReferenceChange(e.target.value)}
        placeholder={method === 'card' ? 'Last 4 digits or auth code' : 'UPI transaction ID'}
        className="h-11 w-full rounded-[10px] border border-charcoal-900/12 bg-surface-white px-3.5 text-sm outline-none focus:border-egg-500"
      />
    </div>
  );
}
