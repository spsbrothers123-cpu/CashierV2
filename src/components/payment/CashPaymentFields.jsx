import { formatCurrency } from '@/utils/currency';

export function CashPaymentFields({ grandTotal, received, onReceivedChange }) {
  const receivedNum = Number(received) || 0;
  const change = Math.max(receivedNum - grandTotal, 0);
  const short = received !== '' && receivedNum < grandTotal;

  return (
    <div className="rounded-[10px] border border-charcoal-900/10 p-3.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-charcoal-500">Bill Total</span>
        <span className="font-semibold text-charcoal-900">{formatCurrency(grandTotal)}</span>
      </div>

      <label htmlFor="cash-received" className="mb-1.5 mt-3 block text-sm font-medium text-charcoal-800">
        Cash Received
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-charcoal-300">
          ₹
        </span>
        <input
          id="cash-received"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          autoFocus
          value={received}
          onChange={(e) => onReceivedChange(e.target.value)}
          placeholder={grandTotal.toFixed(2)}
          className="h-11 w-full rounded-[10px] border border-charcoal-900/12 bg-surface-white pl-7 pr-3 text-sm outline-none focus:border-egg-500"
        />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-charcoal-900/8 pt-3 text-sm">
        <span className="text-charcoal-500">Change</span>
        <span className="font-display text-base font-bold text-charcoal-900">{formatCurrency(change)}</span>
      </div>
      {short && <p className="mt-1.5 text-xs text-danger-600">Cash received is less than the bill total.</p>}
    </div>
  );
}
