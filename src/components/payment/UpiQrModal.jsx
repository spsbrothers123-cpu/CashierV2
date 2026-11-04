import { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UpiQrCode } from './UpiQrCode';
import { useUpiQr } from '@/hooks/useUpiQr';
import { formatCurrency } from '@/utils/currency';
import { isUpiReferenceError, normalizeUpiReference, toPaise, validateUpiReference } from '@/utils/upi';

const NOT_CONFIGURED_MESSAGE = 'UPI QR payment is not configured. Please contact your Admin.';

/**
 * Separate popup for amount-based UPI QR payments.
 *
 * Mount it only while it should be visible — each mount requests a fresh QR
 * (a previous QR is never reused). It never completes a bill by itself:
 *   - Cancel/close only calls onClose (parent keeps cart + payment state).
 *   - Confirm calls onConfirm(normalizedReference); the PARENT decides what
 *     happens (single mode: submit checkout; split mode: attach to the line).
 *
 * @param {number|string} amount        Payable amount for THIS UPI portion only (rupees).
 * @param {'single'|'split'} mode
 * @param {string}  initialReference
 * @param {string[]} takenReferences    Normalized references already used on other lines of this bill.
 * @param {boolean} submitting          Parent is submitting the checkout.
 * @param {object|null} error           Last submit error from the parent (normalized).
 * @param {(ref: string) => void} onConfirm
 * @param {() => void} onClose
 * @param {() => void} onReferenceEdit  Lets the parent clear a stale submit error.
 */
export function UpiQrModal({
  amount,
  mode = 'single',
  initialReference = '',
  takenReferences = [],
  submitting = false,
  error = null,
  onConfirm,
  onClose,
  onReferenceEdit,
}) {
  const paise = toPaise(amount);
  const { status, data, error: qrError, retry } = useUpiQr(paise);
  const [reference, setReference] = useState(initialReference);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef(null);

  // Focus the reference field once there's a QR to pay against.
  useEffect(() => {
    if (status === 'ready') inputRef.current?.focus();
  }, [status]);

  const normalized = normalizeUpiReference(reference);
  const referenceProblem =
    validateUpiReference(reference) ||
    (takenReferences.includes(normalized) ? 'This reference is already used on another payment in this bill.' : null);

  const backendReferenceError = error && isUpiReferenceError(error) ? error.message : null;
  const otherError = error && !isUpiReferenceError(error) ? error : null;
  const fieldError = backendReferenceError || (touched && referenceProblem) || undefined;

  const canConfirm = status === 'ready' && !referenceProblem && !submitting;

  function handleConfirm() {
    setTouched(true);
    if (!canConfirm) return;
    onConfirm(normalized);
  }

  return (
    <Modal open onClose={submitting ? undefined : onClose} title="UPI Payment" className="max-w-sm">
      <div className="mb-4 rounded-[10px] bg-charcoal-900/4 p-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">
          {mode === 'split' ? 'UPI amount' : 'Amount to pay'}
        </p>
        <p className="font-display text-3xl font-bold text-charcoal-900">
          {paise === null ? formatCurrency(0) : formatCurrency(paise / 100)}
        </p>
      </div>

      {status === 'invalid' && (
        <StateBox tone="danger">
          Enter a valid payable amount (more than ₹0.00, up to 2 decimals) to generate a QR.
        </StateBox>
      )}

      {status === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="mx-auto flex size-56 flex-col items-center justify-center gap-2 rounded-[12px] border border-charcoal-900/10 text-sm text-charcoal-400"
        >
          <Loader2 className="size-6 animate-spin" aria-hidden />
          Generating QR…
        </div>
      )}

      {status === 'unconfigured' && <StateBox tone="warning">{NOT_CONFIGURED_MESSAGE}</StateBox>}

      {status === 'error' && (
        <div>
          <StateBox tone="danger">{qrError?.message || 'Could not generate the UPI QR.'}</StateBox>
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <UpiQrCode value={data.upiUri} />
          <dl className="mt-3 space-y-1.5 rounded-[10px] border border-charcoal-900/10 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-charcoal-500">Paying to</dt>
              <dd className="text-right font-medium text-charcoal-900">{data.payeeName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-charcoal-500">UPI ID</dt>
              <dd className="break-all text-right font-medium text-charcoal-900">{data.upiId}</dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-charcoal-500">
            Scanning the QR does not confirm payment. Once the customer has paid, check your payment app or bank
            record and enter the UPI transaction reference below.
          </p>

          <div className="mt-3">
            <Input
              ref={inputRef}
              id="upi-transaction-reference"
              label="UPI transaction reference"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                onReferenceEdit?.();
              }}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              placeholder="e.g. 412345678901"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={submitting}
              error={fieldError}
              hint="6–35 letters or numbers, no spaces."
            />
          </div>
          {mode === 'split' && (
            <p className="mt-2 text-xs text-charcoal-400">
              This reference is attached to this UPI payment. Press Complete Payment afterwards to finish the bill.
            </p>
          )}
        </>
      )}

      {otherError && (
        <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-danger-500/10 px-3 py-2.5 text-sm text-danger-600">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{otherError.message}</span>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={submitting} onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!canConfirm} loading={submitting} onClick={handleConfirm}>
          Confirm Payment
        </Button>
      </div>
    </Modal>
  );
}

function StateBox({ tone, children }) {
  if (tone === 'warning') {
    return (
      <div className="flex items-start gap-2.5 rounded-[10px] border border-warning-500/30 bg-warning-500/10 p-3.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-600" aria-hidden />
        <p className="text-sm font-medium text-charcoal-900">{children}</p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-[10px] bg-danger-500/10 px-3 py-2.5 text-sm text-danger-600">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
