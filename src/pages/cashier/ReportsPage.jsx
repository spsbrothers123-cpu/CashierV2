import { useCallback, useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Select } from '@/components/ui/Select';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { useAuthStore } from '@/store/authStore';
import { getSalesReport } from '@/api/reports';
import { formatCurrency, formatDate } from '@/utils/currency';

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
];

function rangeToDates(range, from, to) {
  const now = new Date();
  if (range === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from: start.toISOString(), to: now.toISOString() };
  }
  if (range === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  return { from: from || undefined, to: to ? `${to}T23:59:59` : undefined };
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-card border border-charcoal-900/8 bg-surface-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-charcoal-900">{value}</p>
    </div>
  );
}

export function ReportsPage() {
  const cashier = useAuthStore((s) => s.cashier);
  const [range, setRange] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [status, setStatus] = useState('loading');
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (range === 'custom' && (!customFrom || !customTo)) return;
    setStatus('loading');
    const { from, to } = rangeToDates(range, customFrom, customTo);
    getSalesReport({ shopId: cashier?.shop?.id, cashierId: cashier?.id, from, to })
      .then((res) => {
        setReport(res);
        setStatus('success');
      })
      .catch((err) => {
        setError(err);
        setStatus('error');
      });
  }, [cashier?.shop?.id, cashier?.id, range, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="size-5 text-charcoal-700" aria-hidden />
          <h1 className="font-display text-xl font-bold text-charcoal-900 sm:text-2xl">Reports</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select aria-label="Report range" value={range} onChange={(e) => setRange(e.target.value)} className="w-40">
            {RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
          {range === 'custom' && (
            <>
              <input
                type="date"
                aria-label="From date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-11 rounded-[10px] border border-charcoal-900/12 bg-surface-white px-3 text-sm outline-none focus:border-egg-500"
              />
              <input
                type="date"
                aria-label="To date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-11 rounded-[10px] border border-charcoal-900/12 bg-surface-white px-3 text-sm outline-none focus:border-egg-500"
              />
            </>
          )}
        </div>
      </div>

      {status === 'loading' && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-card" />
          ))}
        </div>
      )}

      {status === 'error' && <ErrorState message={error?.message} onRetry={load} className="mt-8" />}

      {status === 'success' && report && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Today's Sales" value={formatCurrency(report.sales)} />
            <SummaryCard label="Bills" value={report.billCount} />
            <SummaryCard label="Cash" value={formatCurrency(report.cashSales)} />
            <SummaryCard label="Card" value={formatCurrency(report.cardSales)} />
            <SummaryCard label="UPI" value={formatCurrency(report.upiSales)} />
            <SummaryCard label="Credit" value={formatCurrency(report.creditSales)} />
            <SummaryCard label="Avg. Bill Value" value={formatCurrency(report.averageBillValue)} />
          </div>

          <div className="mt-5 rounded-card border border-charcoal-900/8 bg-surface-white p-4">
            <h2 className="font-display text-sm font-semibold text-charcoal-900">Sales Trend</h2>
            {report.trend.length === 0 ? (
              <EmptyState
                title="No sales in this range"
                description="Completed bills for the selected period will chart here."
                className="py-10"
              />
            ) : (
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.trend.map((t) => ({ ...t, dateLabel: formatDate(t.label) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,32,29,0.08)" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#8A8B82' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8A8B82' }} width={70} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="value" name="Sales" stroke="#D9A928" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-card border border-charcoal-900/8 bg-surface-white p-4">
            <h2 className="font-display text-sm font-semibold text-charcoal-900">Top Products</h2>
            {report.topProducts.length === 0 ? (
              <EmptyState title="No product sales yet" className="py-10" />
            ) : (
              <ul className="mt-2 divide-y divide-charcoal-900/6">
                {report.topProducts.map((p, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-charcoal-900">{p.name}</p>
                      <p className="text-xs text-charcoal-400">{p.quantity} sold</p>
                    </div>
                    <span className="font-semibold text-charcoal-900">{formatCurrency(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
