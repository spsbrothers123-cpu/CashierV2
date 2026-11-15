import { Link } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { NotificationItem } from './NotificationItem';
import { useNotificationStore } from '@/store/notificationStore';

export function NotificationDropdown({ cashier, onOpenItem, onViewAll, onRefresh }) {
  const { items, status, error } = useNotificationStore((s) => s.recent);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const loading = status === 'loading' || status === 'idle';

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="fixed inset-x-3 top-[4.25rem] z-40 max-h-[75dvh] overflow-hidden rounded-card border border-charcoal-900/8 bg-surface-white shadow-lifted sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[24rem]"
    >
      <div className="flex items-center justify-between border-b border-charcoal-900/8 px-4 py-3">
        <h2 className="font-display text-sm font-semibold text-charcoal-900">
          Notifications{unreadCount ? <span className="ml-1.5 text-xs font-medium text-charcoal-500">({unreadCount} unread)</span> : null}
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          disabled={status === 'loading'}
          aria-label="Refresh notifications"
          className="rounded-full p-1.5 text-charcoal-500 hover:bg-charcoal-900/5 disabled:opacity-40"
        >
          <RefreshCw className={status === 'loading' ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
        </button>
      </div>

      <div className="max-h-[55dvh] overflow-y-auto">
        {status === 'error' && items.length === 0 ? (
          <ErrorState className="py-8" message={error?.message || 'Could not load notifications.'} onRetry={onRefresh} />
        ) : loading && items.length === 0 ? (
          <div className="space-y-3 p-4" role="status" aria-label="Loading notifications">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Bell} className="py-8" title="No notifications" description="You're all caught up." />
        ) : (
          <>
            {status === 'error' && (
              <p role="alert" className="border-b border-danger-500/20 bg-danger-500/8 px-4 py-2 text-xs text-danger-600">
                Couldn&apos;t refresh. Showing the last loaded list.{' '}
                <button type="button" onClick={onRefresh} className="font-semibold underline">
                  Retry
                </button>
              </p>
            )}
            <ul>
              {items.map((n) => (
                <NotificationItem key={n.id} notification={n} cashier={cashier} variant="dropdown" onOpen={onOpenItem} />
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="border-t border-charcoal-900/8 px-4 py-2.5 text-center">
        <Link to="/cashier/notifications" onClick={onViewAll} className="text-sm font-medium text-egg-600 hover:underline">
          View all notifications
        </Link>
      </div>
    </div>
  );
}
