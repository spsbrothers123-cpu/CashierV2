import { Plus, X, AlertCircle } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/utils/cn';

const METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'upi', label: 'UPI' },
  { id: 'credit', label: 'Credit' },
];

export function SplitPaymentEditor({ lines, onChange, grandTotal, creditAllowed }) {
  const paid = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const remaining = Math.round((grandTotal - paid) * 100) / 100;
  const isFullyPaid = Math.abs(remaining) < 0.005 && lines.length > 0;

  function updateLine(id, patch) {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id) {
    onChange(lines.filter((l) => l.id !== id));
  }

  function addLine() {
    const usedMethods = new Set(lines.map((l) => l.method));
    const nextMethod = METHODS.find((m) => !usedMethods.has(m.id) && (m.id !== 'credit' || creditAllowed))?.id || 'cash';
    const suggestedAmount = Math.max(remaining, 0);
    onChange([
      ...lines,
      { id: `pl_${Date.now()}_${lines.length}`, method: nextMethod, amount: suggestedAmount || '', reference: '' },
    ]);
  }

  return (
    <div>
      <div className="space-y-2.5">
        {lines.map((line, idx) => (
          <div key={line.id} className="rounded-[10px] border border-charcoal-900/10 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-charcoal-400">Payment {idx + 1}</span>
              <button
                onClick={() => removeLine(line.id)}
                aria-label={`Remove payment ${idx + 1}`}
                className="rounded-full p-1 text-charcoal-300 hover:bg-danger-500/10 hover:text-danger-600"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Select
                aria-label="Payment method"
                value={line.method}
                onChange={(e) => updateLine(line.id, { method: e.target.value })}
              >
                {METHODS.map((m) => (
                  <option key={m.id} value={m.id} disabled={m.id === 'credit' && !creditAllowed}>
                    {m.label}
                    {m.id === 'credit' && !creditAllowed ? ' (select customer)' : ''}
                  </option>
                ))}
              </Select>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-charcoal-300">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  aria-label="Payment amount"
                  value={line.amount}
                  onChange={(e) => updateLine(line.id, { amount: e.target.value })}
                  className="h-11 w-full rounded-[10px] border border-charcoal-900/12 bg-surface-white pl-7 pr-3 text-sm outline-none focus:border-egg-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            {(line.method === 'card' || line.method === 'upi') && (
              <input
                type="text"
                value={line.reference}
                onChange={(e) => updateLine(line.id, { reference: e.target.value })}
                placeholder={`${line.method === 'card' ? 'Card' : 'UPI'} reference (optional)`}
                className="mt-2 h-10 w-full rounded-[10px] border border-charcoal-900/12 bg-surface-white px-3 text-sm outline-none focus:border-egg-500"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addLine}
        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-charcoal-900/20 py-2.5 text-sm font-medium text-charcoal-600 hover:bg-charcoal-900/4"
      >
        <Plus className="size-4" /> Add Payment
      </button>

      <dl className="mt-3.5 space-y-1.5 rounded-[10px] bg-charcoal-900/4 p-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-charcoal-500">Total</dt>
          <dd className="font-medium text-charcoal-900">{formatCurrency(grandTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-charcoal-500">Paid</dt>
          <dd className="font-medium text-charcoal-900">{formatCurrency(paid)}</dd>
        </div>
        <div className="flex justify-between border-t border-charcoal-900/8 pt-1.5">
          <dt className={cn('font-medium', remaining > 0 ? 'text-danger-600' : 'text-charcoal-500')}>Remaining</dt>
          <dd className={cn('font-semibold', remaining > 0 ? 'text-danger-600' : 'text-success-600')}>
            {formatCurrency(Math.max(remaining, 0))}
          </dd>
        </div>
      </dl>

      {remaining < -0.005 && (
        <div className="mt-2.5 flex items-start gap-2 rounded-[10px] bg-danger-500/10 px-3 py-2.5 text-sm text-danger-600">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>Payments add up to more than the bill total. Adjust an amount to continue.</span>
        </div>
      )}

      {lines.length > 0 && isFullyPaid && (
        <p className="mt-2.5 text-center text-sm font-medium text-success-600">Fully Paid</p>
      )}
    </div>
  );
}
