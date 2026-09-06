import { CheckCircle2, Printer, Receipt, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/currency';

const METHOD_LABEL = { cash: 'Cash', card: 'Card', upi: 'UPI', credit: 'Credit' };

export function PaymentSuccessPanel({ bill, onPrintReceipt, onViewBill, onNewBill }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-success-600/12 text-success-600">
        <CheckCircle2 className="size-7" aria-hidden />
      </div>
      <h3 className="font-display text-lg font-bold text-charcoal-900">Payment Successful</h3>
      <p className="mt-1 text-sm text-charcoal-500">Bill {bill.billNumber}</p>

      <p className="mt-4 font-display text-2xl font-bold text-charcoal-900">{formatCurrency(bill.grandTotal)}</p>

      <dl className="mt-4 w-full space-y-1.5 rounded-[10px] bg-charcoal-900/4 p-3.5 text-left text-sm">
        {bill.payments.map((p, i) => (
          <div key={i} className="flex justify-between">
            <dt className="text-charcoal-500">
              {METHOD_LABEL[p.method] || p.method}
              {p.reference ? ` (${p.reference})` : ''}
            </dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(p.amount)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid w-full grid-cols-1 gap-2">
        <Button className="w-full" onClick={onPrintReceipt}>
          <Printer className="size-4" /> Print Receipt
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onViewBill}>
            <Receipt className="size-4" /> View Bill
          </Button>
          <Button variant="dark" onClick={onNewBill}>
            <PlusCircle className="size-4" /> New Bill
          </Button>
        </div>
      </div>
    </div>
  );
}
