import { useEffect, useRef, useState } from 'react';
import { Wallet, CreditCard, Smartphone, Receipt, AlertCircle, SplitSquareHorizontal } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CashPaymentFields } from './CashPaymentFields';
import { ReferencePaymentFields } from './ReferencePaymentFields';
import { CreditPaymentFields } from './CreditPaymentFields';
import { SplitPaymentEditor } from './SplitPaymentEditor';
import { PaymentSuccessPanel } from './PaymentSuccessPanel';
import { UpiQrModal } from './UpiQrModal';
import { checkoutBill } from '@/api/bills';
import { printReceipt } from '@/utils/printReceipt';
import { formatCurrency } from '@/utils/currency';
import { makeIdempotencyKey } from '@/utils/id';
import {
  UPI_ERROR_CODES,
  isDefinitiveRejection,
  normalizeUpiReference,
  toPaise,
  validateUpiReference,
} from '@/utils/upi';
import { cn } from '@/utils/cn';
import { CHECKOUT_RECONCILE_CODES } from '@/utils/cartReconcile';

const METHODS = [
  { id: 'cash', label: 'Cash', icon: Wallet },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'credit', label: 'Credit', icon: Receipt },
];

export function PaymentModal({
  open,
  onClose,
  cashier,
  session,
  items,
  customer,
  totals,
  initialMethod = 'cash',
  onSelectCustomer,
  onSuccess,
  onViewBill,
  onCheckoutRejected,
}) {
  const [stage, setStage] = useState('form'); // 'form' | 'success'
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [method, setMethod] = useState(initialMethod);
  const [cashReceived, setCashReceived] = useState('');
  const [reference, setReference] = useState('');
  const [splitLines, setSplitLines] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [bill, setBill] = useState(null);
  // null | { type: 'single' } | { type: 'split', lineId } — which UPI QR popup is showing
  const [qrTarget, setQrTarget] = useState(null);
  const idempotencyKeyRef = useRef(makeIdempotencyKey());
  const submittingRef = useRef(false); // belt-and-suspenders double-click guard

  // Reset the whole flow whenever the sheet is (re)opened for a new bill.
  useEffect(() => {
    if (open) {
      setStage('form');
      setSplitEnabled(false);
      setMethod(initialMethod);
      setCashReceived('');
      setReference('');
      setSplitLines([]);
      setError(null);
      setBill(null);
      // UPI preselected from the Cart -> open the QR popup as the sheet opens.
      setQrTarget(initialMethod === 'upi' ? { type: 'single' } : null);
      idempotencyKeyRef.current = makeIdempotencyKey();
      submittingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const grandTotal = totals.grandTotal;
  const creditAllowed = !!customer;

  function buildPayments(refOverride) {
    if (!splitEnabled) {
      const payment = { method, amount: grandTotal };
      if (method === 'cash') {
        const receivedNum = Number(cashReceived) || 0;
        payment.cashReceived = receivedNum;
        payment.change = Math.max(receivedNum - grandTotal, 0);
      } else if (method === 'upi') {
        payment.reference = normalizeUpiReference(refOverride ?? reference);
      } else if (method === 'card') {
        if (reference.trim()) payment.reference = reference.trim();
      }
      return [payment];
    }
    return splitLines.map((l) => ({
      method: l.method,
      amount: Number(l.amount) || 0,
      ...(l.method === 'upi'
        ? { reference: normalizeUpiReference(l.reference) }
        : l.reference?.trim()
          ? { reference: l.reference.trim() }
          : {}),
    }));
  }

  function validate(refOverride) {
    if (!splitEnabled) {
      if (method === 'credit' && !creditAllowed) return 'Select a customer before completing credit billing.';
      if (method === 'cash' && Number(cashReceived) < grandTotal) return 'Cash received is less than the bill total.';
      if (method === 'upi') {
        if (toPaise(grandTotal) === null) return 'UPI payment needs a valid amount.';
        if (validateUpiReference(refOverride ?? reference)) {
          return 'Show the UPI QR and confirm the transaction reference to complete payment.';
        }
      }
      return null;
    }
    if (splitLines.length === 0) return 'Add at least one payment.';
    const paid = splitLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    if (Math.round((paid - grandTotal) * 100) !== 0) return 'Split payments must add up to the bill total.';
    if (splitLines.some((l) => !(Number(l.amount) > 0))) return 'Each payment amount must be greater than zero.';
    if (splitLines.some((l) => l.method === 'credit') && !creditAllowed) {
      return 'Select a customer before including credit in a split payment.';
    }
    // UPI lines: the reference is mandatory and must be unique within the bill.
    // (The backend remains the authority, incl. uniqueness across branches.)
    const upiLines = splitLines.filter((l) => l.method === 'upi');
    if (upiLines.some((l) => validateUpiReference(l.reference))) {
      return 'Show the QR and confirm the reference for each UPI payment.';
    }
    const refs = upiLines.map((l) => normalizeUpiReference(l.reference));
    if (new Set(refs).size !== refs.length) return 'Each UPI payment needs a different reference.';
    return null;
  }

  const validationError = validate();

  // `opts.reference` lets the QR popup submit with the reference it just
  // collected (state updates aren't visible within the same tick).
  async function handleSubmit(opts) {
    const refOverride = opts?.reference;
    const blocked = refOverride !== undefined ? validate(refOverride) : validationError;
    if (submittingRef.current || blocked) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    const payments = buildPayments(refOverride);
    try {
      const result = await checkoutBill({
        shopId: cashier?.shop?.id,
        cashierId: cashier?.id,
        cashierName: cashier?.name,
        sessionId: session?.id,
        shop: cashier?.shop,
        customer,
        items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        grandTotal,
        payments,
        idempotencyKey: idempotencyKeyRef.current,
      });
      setBill(result);
      setStage('success');
      setQrTarget(null);
      onSuccess?.(result);
    } catch (err) {
      setError(err);
      // Stock/price moved since the cart was built: let the caller refresh the
      // cart against the live catalogue. Nothing was created, nothing is retried.
      if (CHECKOUT_RECONCILE_CODES.has(err?.code)) onCheckoutRejected?.(err);
      if (payments.some((p) => p.method === 'upi')) {
        // A definitive rejection created nothing, so a fresh key is safe (and
        // avoids a backend replaying a cached failure). Network errors / 5xx
        // keep the same key: the outcome is unknown and a retry must stay idempotent.
        if (isDefinitiveRejection(err)) idempotencyKeyRef.current = makeIdempotencyKey();
        if (err?.code === UPI_ERROR_CODES.DUPLICATE_REFERENCE) clearRejectedReference(err);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // The backend refused a reference as a duplicate -> it can't be reused.
  function clearRejectedReference(err) {
    if (!splitEnabled) {
      setReference('');
      return;
    }
    const rejected = normalizeUpiReference(err?.raw?.data?.reference);
    setSplitLines((lines) =>
      lines.map((l) =>
        l.method === 'upi' && (!rejected || normalizeUpiReference(l.reference) === rejected)
          ? { ...l, reference: '' }
          : l
      )
    );
  }

  function selectMethod(id) {
    // Never carry a card reference into UPI (or a UPI one out of it).
    if (id !== method && (id === 'upi' || method === 'upi')) setReference('');
    setMethod(id);
    if (id === 'upi') {
      setError(null);
      setQrTarget({ type: 'single' });
    }
  }

  function handleShowUpiQr(line) {
    setError(null);
    setQrTarget({ type: 'split', lineId: line.id });
  }

  async function handleUpiConfirm(ref) {
    if (qrTarget?.type === 'split') {
      // Split: attach the reference to that UPI line only. The bill is
      // completed (and the reference validated by the backend) when the
      // cashier presses Complete Payment.
      const lineId = qrTarget.lineId;
      setSplitLines((lines) => lines.map((l) => (l.id === lineId ? { ...l, reference: ref } : l)));
      setQrTarget(null);
      return;
    }
    setReference(ref);
    await handleSubmit({ reference: ref });
  }

  const qrLine = qrTarget?.type === 'split' ? splitLines.find((l) => l.id === qrTarget.lineId) : null;
  const showQrPopup = stage === 'form' && !!qrTarget && (qrTarget.type === 'single' || !!qrLine);
  const takenReferences =
    qrTarget?.type === 'split'
      ? splitLines
          .filter((l) => l.id !== qrTarget.lineId && l.method === 'upi')
          .map((l) => normalizeUpiReference(l.reference))
          .filter(Boolean)
      : [];

  return (
    <>
    <Modal
      open={open}
      // While the QR popup is on top, only the popup handles Escape/close.
      onClose={qrTarget ? undefined : stage === 'success' ? onClose : submitting ? undefined : onClose}
      title={stage === 'success' ? 'Payment' : 'Complete Payment'}
      className="max-w-md"
    >
      {stage === 'success' && bill ? (
        <PaymentSuccessPanel
          bill={bill}
          onPrintReceipt={() => printReceipt(bill)}
          onViewBill={() => onViewBill?.(bill)}
          onNewBill={onClose}
        />
      ) : (
        <div>
          <div className="mb-4 rounded-[10px] bg-charcoal-900/4 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">Total</p>
            <p className="font-display text-3xl font-bold text-charcoal-900">{formatCurrency(grandTotal)}</p>
          </div>

          <button
            onClick={() => setSplitEnabled((v) => !v)}
            className={cn(
              'mb-4 flex w-full items-center justify-center gap-2 rounded-[10px] border py-2.5 text-sm font-medium transition-colors',
              splitEnabled
                ? 'border-egg-500 bg-egg-300/20 text-charcoal-900'
                : 'border-charcoal-900/12 text-charcoal-600 hover:bg-charcoal-900/4'
            )}
          >
            <SplitSquareHorizontal className="size-4" aria-hidden />
            Split Payment
          </button>

          {!splitEnabled && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {METHODS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => selectMethod(id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-[10px] border py-3 text-xs font-medium transition-colors',
                      method === id
                        ? 'border-egg-500 bg-egg-300/20 text-charcoal-900'
                        : 'border-charcoal-900/10 text-charcoal-500 hover:bg-charcoal-900/4'
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-3.5">
                {method === 'cash' && (
                  <CashPaymentFields grandTotal={grandTotal} received={cashReceived} onReceivedChange={setCashReceived} />
                )}
                {(method === 'card' || method === 'upi') && (
                  <ReferencePaymentFields
                    method={method}
                    grandTotal={grandTotal}
                    reference={reference}
                    onReferenceChange={setReference}
                    onShowQr={() => selectMethod('upi')}
                  />
                )}
                {method === 'credit' && (
                  <CreditPaymentFields customer={customer} grandTotal={grandTotal} onSelectCustomer={onSelectCustomer} />
                )}
              </div>
            </>
          )}

          {splitEnabled && (
            <div className="mt-3.5">
              <SplitPaymentEditor
                lines={splitLines}
                onChange={setSplitLines}
                grandTotal={grandTotal}
                creditAllowed={creditAllowed}
                onShowUpiQr={handleShowUpiQr}
              />
            </div>
          )}

          {error && !showQrPopup && (
            <div className="mt-3.5 flex items-start gap-2 rounded-[10px] bg-danger-500/10 px-3 py-2.5 text-sm text-danger-600">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error.message}</span>
            </div>
          )}

          <Button
            size="lg"
            className="mt-4 w-full"
            disabled={!!validationError}
            loading={submitting}
            onClick={() => handleSubmit()}
          >
            Complete Payment
          </Button>
          {validationError && !submitting && (
            <p className="mt-2 text-center text-xs text-charcoal-400">{validationError}</p>
          )}
        </div>
      )}
    </Modal>

    {open && showQrPopup && (
      <UpiQrModal
        amount={qrTarget.type === 'split' ? qrLine.amount : grandTotal}
        mode={qrTarget.type}
        initialReference={qrTarget.type === 'split' ? qrLine.reference : reference}
        takenReferences={takenReferences}
        submitting={submitting}
        error={error}
        onConfirm={handleUpiConfirm}
        onClose={() => setQrTarget(null)}
        onReferenceEdit={() => setError(null)}
      />
    )}
    </>
  );
}
