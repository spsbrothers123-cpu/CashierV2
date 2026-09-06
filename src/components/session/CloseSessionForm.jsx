import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/utils/cn';

export function CloseSessionForm({ open, onClose, session, submitting, error, onConfirm }) {
  const [actualCash, setActualCash] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const expectedCash = session?.expectedCash ?? 0;
  const actualNum = Number(actualCash);
  const hasActual = actualCash !== '' && !Number.isNaN(actualNum);
  const difference = hasActual ? Math.round((actualNum - expectedCash) * 100) / 100 : null;

  function handleClose() {
    setActualCash('');
    setConfirming(false);
    setValidationError(null);
    onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (actualCash === '' || Number.isNaN(actualNum) || actualNum < 0) {
      setValidationError('Enter a valid closing cash amount (0 or more).');
      return;
    }
    setValidationError(null);
    if (!confirming) {
      setConfirming(true); // require an explicit confirmation step before closing
      return;
    }
    onConfirm(actualNum);
  }

  return (
    <Modal open={open} onClose={submitting ? undefined : handleClose} title="Close Session">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-charcoal-500">Opening Cash</dt>
          <dd className="font-medium text-charcoal-900">{formatCurrency(session?.openingCash)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-charcoal-500">Cash Sales</dt>
          <dd className="font-medium text-charcoal-900">{formatCurrency(session?.cashSales)}</dd>
        </div>
        <div className="flex justify-between border-t border-charcoal-900/8 pt-2">
          <dt className="font-medium text-charcoal-700">Expected Cash</dt>
          <dd className="font-semibold text-charcoal-900">{formatCurrency(expectedCash)}</dd>
        </div>
      </dl>

      <form onSubmit={handleSubmit} noValidate className="mt-4">
        <Input
          label="Actual Closing Cash"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={actualCash}
          onChange={(e) => {
            setActualCash(e.target.value);
            setConfirming(false);
          }}
          placeholder="0.00"
          error={validationError}
          disabled={submitting}
          required
        />

        {hasActual && (
          <dl className="mt-3 space-y-1.5 rounded-[10px] bg-charcoal-900/4 p-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-charcoal-500">Expected</dt>
              <dd className="font-medium text-charcoal-900">{formatCurrency(expectedCash)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal-500">Actual</dt>
              <dd className="font-medium text-charcoal-900">{formatCurrency(actualNum)}</dd>
            </div>
            <div className="flex justify-between border-t border-charcoal-900/8 pt-1.5">
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
          </dl>
        )}

        {confirming && (
          <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-warning-500/10 px-3 py-2.5 text-sm text-warning-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>This will close your shift. Confirm the amount is correct — this can&apos;t be undone here.</span>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-danger-500/10 px-3 py-2.5 text-sm text-danger-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{error.message}</span>
          </div>
        )}

        <Button type="submit" loading={submitting} className="mt-4 w-full" size="lg">
          {confirming ? 'Confirm & Close Session' : 'Close Session'}
        </Button>
      </form>
    </Modal>
  );
}
