import { useCallback, useEffect, useState } from 'react';
import { History, Printer, Eye } from 'lucide-react';
import { SearchBar } from '@/components/pos/SearchBar';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { BillDetails } from '@/components/bills/BillDetails';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/store/authStore';
import { getBillHistory } from '@/api/bills';
import { formatCurrency, formatDateTime } from '@/utils/currency';
import { printReceipt } from '@/utils/printReceipt';

const METHOD_LABEL = { cash: 'Cash', card: 'Card', upi: 'UPI', credit: 'Credit' };

export function HistoryPage() {
  const cashier = useAuthStore((s) => s.cashier);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 350);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('loading');
  const [bills, setBills] = useState([]);
  const [error, setError] = useState(null);
  const [viewingBill, setViewingBill] = useState(null);

  const load = useCallback(() => {
    setStatus('loading');
    getBillHistory({
      shopId: cashier?.shop?.id,
      query: debouncedQuery,
      paymentMethod: paymentMethod || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
    })
      .then((res) => {
        setBills(res);
        setStatus('success');
      })
      .catch((err) => {
        setError(err);
        setStatus('error');
      });
  }, [cashier?.shop?.id, debouncedQuery, paymentMethod, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2.5">
        <History className="size-5 text-charcoal-700" aria-hidden />
        <h1 className="font-display text-xl font-bold text-charcoal-900 sm:text-2xl">Bill History</h1>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <SearchBar value={query} onChange={setQuery} placeholder="Bill no., customer name, or phone…" />
        </div>
        <Select aria-label="Filter by payment method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="">All payment methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
          <option value="credit">Credit</option>
        </Select>
        <input
          type="date"
          aria-label="From date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-11 w-full rounded-[10px] border border-charcoal-900/12 bg-surface-white px-3.5 text-sm text-charcoal-900 outline-none focus:border-egg-500"
        />
        <input
          type="date"
          aria-label="To date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-11 w-full rounded-[10px] border border-charcoal-900/12 bg-surface-white px-3.5 text-sm text-charcoal-900 outline-none focus:border-egg-500"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-card border border-charcoal-900/8 bg-surface-white">
        {status === 'loading' && (
          <div className="divide-y divide-charcoal-900/6 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/6" />
              </div>
            ))}
          </div>
        )}

        {status === 'error' && <ErrorState message={error?.message} onRetry={load} />}

        {status === 'success' && bills.length === 0 && (
          <EmptyState
            icon={History}
            title="No bills found"
            description="Completed sales matching your filters will appear here."
          />
        )}

        {status === 'success' && bills.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-charcoal-900/4 text-xs text-charcoal-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Bill No.</th>
                  <th className="px-4 py-2.5 text-left font-medium">Date</th>
                  <th className="px-4 py-2.5 text-left font-medium">Customer</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 text-left font-medium">Payment</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-900/6">
                {bills.map((bill) => (
                  <tr key={bill.id}>
                    <td className="px-4 py-3 font-medium text-charcoal-900">{bill.billNumber}</td>
                    <td className="px-4 py-3 text-charcoal-500">{formatDateTime(bill.createdAt)}</td>
                    <td className="px-4 py-3 text-charcoal-700">{bill.customer?.name || 'Walk-in'}</td>
                    <td className="px-4 py-3 text-right font-medium text-charcoal-900">
                      {formatCurrency(bill.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-charcoal-500">
                      {bill.payments.length > 1
                        ? 'Split'
                        : METHOD_LABEL[bill.payments[0]?.method] || bill.payments[0]?.method}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="success">Paid</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setViewingBill(bill)}
                          aria-label={`View bill ${bill.billNumber}`}
                          className="rounded-[8px] p-1.5 text-charcoal-500 hover:bg-charcoal-900/6"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          onClick={() => printReceipt(bill)}
                          aria-label={`Reprint bill ${bill.billNumber}`}
                          className="rounded-[8px] p-1.5 text-charcoal-500 hover:bg-charcoal-900/6"
                        >
                          <Printer className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BillDetails open={!!viewingBill} onClose={() => setViewingBill(null)} bill={viewingBill} />
    </div>
  );
}
