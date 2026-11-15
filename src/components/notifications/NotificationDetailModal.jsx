import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AnnouncementCard } from './AnnouncementCard';
import { useNotificationStore } from '@/store/notificationStore';
import { CATEGORY_LABELS } from '@/types/notifications';
import { formatWhen, routeForTarget } from '@/utils/notificationRoutes';

/** Viewing details NEVER marks the notification read — only the explicit button does. */
export function NotificationDetailModal({ notification: n, cashier, onClose }) {
  const pending = useNotificationStore((s) => s.pending[n?.id]);
  const error = useNotificationStore((s) => s.actionErrors[n?.id]);
  const setRead = useNotificationStore((s) => s.setRead);
  if (!n) return null;
  const route = routeForTarget(n.target);
  const unread = !n.readAt;

  return (
    <Modal
      open
      onClose={onClose}
      title="Notification details"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" loading={pending === 'read'} disabled={!!pending} onClick={() => setRead(cashier, n.id, unread)}>
            {unread ? 'Mark as read' : 'Mark as unread'}
          </Button>
          <div className="flex gap-2">
            {route && (
              <Link to={route} onClick={onClose} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-sm font-medium text-egg-600 hover:bg-charcoal-900/5">
                <ExternalLink className="size-4" aria-hidden /> Open record
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      {n.announcement ? (
        <AnnouncementCard notification={n} cashier={cashier} />
      ) : (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{CATEGORY_LABELS[n.category] || n.category}</Badge>
            <Badge tone={unread ? 'primary' : 'neutral'}>{unread ? 'Unread' : 'Read'}</Badge>
          </div>
          <h3 className="font-display text-base font-semibold text-charcoal-900">{n.title}</h3>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-charcoal-700">{n.message}</p>
          <p className="mt-2 text-xs text-charcoal-300">{formatWhen(n.createdAt)}</p>
        </div>
      )}
      {error && !n.announcement && (
        <p role="alert" className="mt-3 text-sm text-danger-600">
          {error}
        </p>
      )}
    </Modal>
  );
}
