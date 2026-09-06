import { useEffect, useRef, useState } from 'react';
import { Wallet, CreditCard, Smartphone, Receipt, AlertCircle, SplitSquareHorizontal } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CashPaymentFields } from './CashPaymentFields';
import { ReferencePaymentFields } from './ReferencePaymentFields';
import { CreditPaymentFields } from './CreditPaymentFields';
import { SplitPaymentEditor } from './SplitPaymentEditor';
import { PaymentSuccessPanel } from './PaymentSuccessPanel';
import { checkoutBill } from '@/api/bills';
import { printReceipt } from '@/utils/printReceipt';
import { formatCurrency } from '@/utils/currency';
import { makeIdempotencyKey } from '@/utils/id';
import { cn } from '@/utils/cn';

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
      idempotencyKeyRef.current = makeIdempotencyKey();
      submittingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const grandTotal = totals.grandTotal;
  const creditAllowed = !!customer;

  function buildPayments() {
    if (!splitEnabled) {
      const payment = { method, amount: grandTotal };
      if (method === 'cash') {
        const receivedNum = Number(cashReceived) || 0;
        payment.cashReceived = receivedNum;
        payment.change = Math.max(receivedNum - grandTotal, 0);
      } else if (method === 'card' || method === 'upi') {
        if (reference.trim()) payment.reference = reference.trim();
      }
      return [payment];
    }
    return splitLines.map((l) => ({
      method: l.method,
      amount: Number(l.amount) || 0,
      ...(l.reference?.trim() ? { reference: l.reference.trim() } : {}),
    }));
  }

  function validate() {
    if (!splitEnabled) {
      if (method === 'credit' && !creditAllowed) return 'Select a customer before completing credit billing.';
      if (method === 'cash' && Number(cashReceived) < grandTotal) return 'Cash received is less than the bill total.';
      return null;
    }
    if (splitLines.length === 0) return 'Add at least one payment.';
    const paid = splitLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    if (Math.round((paid - grandTotal) * 100) !== 0) return 'Split payments must add up to the bill total.';
    if (splitLines.some((l) => !(Number(l.amount) > 0))) return 'Each payment amount must be greater than zero.';
    if (splitLines.some((l) => l.method === 'credit') && !creditAllowed) {
      return 'Select a customer before including credit in a split payment.';
    }
    return null;
  }

  const validationError = validate();

  async function handleSubmit() {
    if (submittingRef.current || validationError) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
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
        payments: buildPayments(),
        idempotencyKey: idempotencyKeyRef.current,
      });
      setBill(result);
      setStage('success');
      onSuccess?.(result);
    } catch (err) {
      setError(err);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={stage === 'success' ? onClose : submitting ? undefined : onClose}
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
                    onClick={() => setMethod(id)}
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
              />
            </div>
          )}

          {error && (
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
            onClick={handleSubmit}
          >
            Complete Payment
          </Button>
          {validationError && !submitting && (
            <p className="mt-2 text-center text-xs text-charcoal-400">{validationError}</p>
          )}
        </div>
      )}
    </Modal>
  );
}
