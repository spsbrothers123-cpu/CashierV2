import { Printer } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateTime } from '@/utils/currency';
import { printReceipt } from '@/utils/printReceipt';

const METHOD_LABEL = { cash: 'Cash', card: 'Card', upi: 'UPI', credit: 'Credit' };

export function BillDetails({ open, onClose, bill }) {
  if (!bill) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Bill ${bill.billNumber}`} className="max-w-xl">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-charcoal-400">Shop</dt>
          <dd className="font-medium text-charcoal-900">{bill.shop?.name || '—'}</dd>
        </div>
        <div>
          <dt className="text-charcoal-400">Date</dt>
          <dd className="font-medium text-charcoal-900">{formatDateTime(bill.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-charcoal-400">Cashier</dt>
          <dd className="font-medium text-charcoal-900">{bill.cashierName || '—'}</dd>
        </div>
        <div>
          <dt className="text-charcoal-400">Customer</dt>
          <dd className="font-medium text-charcoal-900">{bill.customer?.name || 'Walk-in'}</dd>
        </div>
      </dl>

      <div className="mt-4 overflow-hidden rounded-[10px] border border-charcoal-900/8">
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/4 text-xs text-charcoal-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Item</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-900/6">
            {bill.items.map((i, idx) => {
              const unitPrice = i.unitPrice ?? i.product.price;
              return (
                <tr key={idx}>
                  <td className="px-3 py-2 text-charcoal-900">{i.product.name}</td>
                  <td className="px-3 py-2 text-right text-charcoal-700">{i.quantity}</td>
                  <td className="px-3 py-2 text-right text-charcoal-700">{formatCurrency(unitPrice)}</td>
                  <td className="px-3 py-2 text-right font-medium text-charcoal-900">
                    {formatCurrency(unitPrice * i.quantity)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-charcoal-500">Subtotal</dt>
          <dd className="font-medium text-charcoal-900">{formatCurrency(bill.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-charcoal-500">Discount</dt>
          <dd className="font-medium text-charcoal-900">-{formatCurrency(bill.discount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-charcoal-500">Tax</dt>
          <dd className="font-medium text-charcoal-900">{formatCurrency(bill.tax)}</dd>
        </div>
        <div className="flex justify-between border-t border-charcoal-900/8 pt-1.5">
          <dt className="font-display font-semibold text-charcoal-900">Grand Total</dt>
          <dd className="font-display text-base font-bold text-charcoal-900">{formatCurrency(bill.grandTotal)}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-charcoal-400">Payment breakdown</p>
        <dl className="space-y-1.5 rounded-[10px] bg-charcoal-900/4 p-3 text-sm">
          {bill.payments.map((p, idx) => (
            <div key={idx} className="flex justify-between">
              <dt className="text-charcoal-600">
                {METHOD_LABEL[p.method] || p.method}
                {p.reference ? ` (${p.reference})` : ''}
              </dt>
              <dd className="font-medium text-charcoal-900">{formatCurrency(p.amount)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Button variant="outline" className="mt-5 w-full" onClick={() => printReceipt(bill)}>
        <Printer className="size-4" /> Reprint Receipt
      </Button>
    </Modal>
  );
}
