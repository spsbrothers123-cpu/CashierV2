import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationDetailModal } from '@/components/notifications/NotificationDetailModal';
import { NotificationSettingsPanel } from '@/components/notifications/NotificationSettingsPanel';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { NOTIFICATION_CATEGORIES, CATEGORY_LABELS } from '@/types/notifications';
import { cn } from '@/utils/cn';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
];

export function NotificationsPage() {
  const cashier = useAuthStore((s) => s.cashier);
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('list'); // list | settings
  const { items, status, error, nextCursor, loadingMore, filters } = useNotificationStore((s) => s.page);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const recentItems = useNotificationStore((s) => s.recent.items);
  const loadPage = useNotificationStore((s) => s.loadPage);
  const loadRecent = useNotificationStore((s) => s.loadRecent);
  const setFilters = useNotificationStore((s) => s.setFilters);
  const fetchOne = useNotificationStore((s) => s.fetchOne);
  const [fetched, setFetched] = useState(null);

  const openId = params.get('open');
  const cashierId = cashier?.id;
  const { status: fStatus, category, from, to } = filters;

  // Reload whenever the cashier or any filter changes. The store drops stale
  // (older-request / previous-cashier) responses itself.
  useEffect(() => {
    if (cashier) loadPage(cashier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashierId, fStatus, category, from, to]);

  // Deep link (?open=<id>) from the dropdown: show details WITHOUT marking read.
  const known = openId ? items.find((n) => n.id === openId) || recentItems.find((n) => n.id === openId) : null;
  useEffect(() => {
    let live = true;
    setFetched(null);
    if (openId && cashier && !known) {
      fetchOne(cashier, openId).then((n) => live && setFetched(n));
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, cashierId]);

  const selected = known || (fetched && fetched.id === openId ? fetched : null);
  // Always render the freshest copy from the store (read/ack changes).
  const live = selected ? items.find((n) => n.id === selected.id) || recentItems.find((n) => n.id === selected.id) || selected : null;

  const openDetails = useCallback(
    (n) => {
      const next = new URLSearchParams(params);
      next.set('open', n.id);
      setParams(next, { replace: true });
    },
    [params, setParams]
  );
  const closeDetails = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('open');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const refresh = () => {
    loadPage(cashier);
    loadRecent(cashier);
  };
  const filtered = fStatus !== 'all' || category || from || to;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-charcoal-900 sm:text-2xl">Notifications</h1>
          <p className="mt-1 text-sm text-charcoal-500">{unreadCount ? `${unreadCount} unread` : 'Everything for your branch, in one place.'}</p>
        </div>
        {view === 'list' && (
          <Button variant="outline" size="sm" onClick={refresh} disabled={status === 'loading'}>
            <RefreshCw className={cn('size-4', status === 'loading' && 'animate-spin')} aria-hidden /> Refresh
          </Button>
        )}
      </div>

      <div role="tablist" aria-label="Notification views" className="mt-5 inline-flex rounded-[10px] bg-charcoal-900/6 p-1">
        {[
          { id: 'list', label: 'Notifications' },
          { id: 'settings', label: 'Settings' },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={view === t.id}
            onClick={() => setView(t.id)}
            className={cn('rounded-[8px] px-3.5 py-1.5 text-sm font-medium', view === t.id ? 'bg-surface-white text-charcoal-900 shadow-soft' : 'text-charcoal-500')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'settings' ? (
        <div className="mt-5">
          <NotificationSettingsPanel cashier={cashier} />
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-3">
            <div role="group" aria-label="Read filter" className="flex gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  aria-pressed={fStatus === t.id}
                  onClick={() => setFilters({ status: t.id })}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-sm font-medium',
                    fStatus === t.id ? 'bg-charcoal-900 text-ivory-50' : 'bg-charcoal-900/6 text-charcoal-600 hover:bg-charcoal-900/10'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select label="Category" name="category" value={category} onChange={(e) => setFilters({ category: e.target.value })}>
                <option value="">All categories</option>
                {NOTIFICATION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
              <Input label="From date" name="from" type="date" value={from} max={to || undefined} onChange={(e) => setFilters({ from: e.target.value })} />
              <Input label="To date" name="to" type="date" value={to} min={from || undefined} onChange={(e) => setFilters({ to: e.target.value })} />
            </div>
            {filtered && (
              <button type="button" className="text-sm font-medium text-egg-600 hover:underline" onClick={() => setFilters({ status: 'all', category: '', from: '', to: '' })}>
                Clear filters
              </button>
            )}
          </div>

          <div className="mt-5">
            {status === 'error' ? (
              <ErrorState message={error?.message || 'Could not load notifications.'} onRetry={() => loadPage(cashier)} />
            ) : status === 'loading' || status === 'idle' ? (
              <div className="space-y-3" role="status" aria-label="Loading notifications">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState icon={Bell} title={filtered ? 'No matching notifications' : 'No notifications'} description={filtered ? 'Try changing or clearing the filters.' : "You're all caught up."} />
            ) : (
              <>
                <ul className="space-y-3">
                  {items.map((n) => (
                    <NotificationItem key={n.id} notification={n} cashier={cashier} variant="page" onOpen={openDetails} />
                  ))}
                </ul>
                {error && (
                  <p role="alert" className="mt-3 text-sm text-danger-600">
                    Could not load more: {error.message}
                  </p>
                )}
                {nextCursor && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" loading={loadingMore} onClick={() => loadPage(cashier, { append: true })}>
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {live && <NotificationDetailModal notification={live} cashier={cashier} onClose={closeDetails} />}
    </div>
  );
}
