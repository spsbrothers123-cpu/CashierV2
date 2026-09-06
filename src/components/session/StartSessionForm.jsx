import { useState } from 'react';
import { Clock3, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/utils/currency';

export function StartSessionForm({ cashier, onStart, submitting, error }) {
  const [openingCash, setOpeningCash] = useState('');
  const [validationError, setValidationError] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    const value = Number(openingCash);
    if (openingCash === '' || Number.isNaN(value) || value < 0) {
      setValidationError('Enter a valid opening cash amount (0 or more).');
      return;
    }
    setValidationError(null);
    onStart(value);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-egg-300/30 text-egg-600">
          <Clock3 className="size-6" aria-hidden />
        </div>
        <h1 className="font-display text-xl font-bold text-charcoal-900">Start Your Shift</h1>
        <p className="mt-1 text-sm text-charcoal-500">Confirm your details and set your opening cash to begin.</p>
      </div>

      <div className="rounded-card border border-charcoal-900/8 bg-surface-white p-5 shadow-soft">
        <dl className="mb-5 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Cashier</dt>
            <dd className="font-medium text-charcoal-900">{cashier?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Shop</dt>
            <dd className="font-medium text-charcoal-900">{cashier?.shop?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Date &amp; time</dt>
            <dd className="font-medium text-charcoal-900">{formatDateTime(new Date())}</dd>
          </div>
        </dl>

        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="Opening cash"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            placeholder="0.00"
            error={validationError}
            disabled={submitting}
            required
          />

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-danger-500/10 px-3 py-2.5 text-sm text-danger-600">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error.message}</span>
            </div>
          )}

          <Button type="submit" loading={submitting} className="mt-5 w-full" size="lg">
            Start Session
          </Button>
        </form>
      </div>
    </div>
  );
}
