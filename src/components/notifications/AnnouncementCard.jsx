import { CheckCircle2, Clock3, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/store/notificationStore';
import { formatWhen } from '@/utils/notificationRoutes';

/**
 * Read status and acknowledgement status are two independent states and are
 * rendered as two separate rows. Acknowledging never marks read; reading never
 * acknowledges. An acknowledgement-required announcement stays visibly
 * "pending" until the server confirms the acknowledgement.
 */
export function AnnouncementStatus({ notification }) {
  const a = notification.announcement;
  const isRead = !!notification.readAt;
  const required = !!a?.requiresAcknowledgement;
  const acknowledged = required && !!a?.acknowledgedAt;
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs" aria-label="Announcement status">
      <div className="flex items-center gap-1.5">
        <dt className="text-charcoal-300">Read status:</dt>
        <dd>
          <Badge tone={isRead ? 'neutral' : 'primary'}>{isRead ? 'Read' : 'Unread'}</Badge>
        </dd>
      </div>
      {required ? (
        <div className="flex items-center gap-1.5">
          <dt className="text-charcoal-300">Acknowledgement:</dt>
          <dd>
            {acknowledged ? (
              <Badge tone="success">Acknowledged {formatWhen(a.acknowledgedAt)}</Badge>
            ) : (
              <Badge tone="warning">Acknowledgement pending</Badge>
            )}
          </dd>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <dt className="text-charcoal-300">Acknowledgement:</dt>
          <dd className="text-charcoal-500">Not required</dd>
        </div>
      )}
    </dl>
  );
}

export function AnnouncementCard({ notification, cashier }) {
  const a = notification.announcement;
  const pending = useNotificationStore((s) => s.pending[notification.id]);
  const error = useNotificationStore((s) => s.actionErrors[notification.id]);
  const acknowledge = useNotificationStore((s) => s.acknowledge);
  if (!a) return null;

  const needsAck = a.requiresAcknowledgement && !a.acknowledgedAt;
  const submitting = pending === 'ack';

  return (
    <section className="rounded-card border border-charcoal-900/8 bg-surface-white p-4 shadow-soft" aria-label="Announcement">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Megaphone className="size-4 text-egg-600" aria-hidden />
        <Badge tone="primary">{a.audience === 'all_cashiers' ? 'All cashiers' : 'For you'}</Badge>
        {a.requiresAcknowledgement && <Badge tone="warning">Acknowledgement required</Badge>}
      </div>
      <h3 className="font-display text-base font-semibold text-charcoal-900">{notification.title}</h3>
      <p className="mt-1.5 whitespace-pre-wrap text-sm text-charcoal-700">{a.body || notification.message}</p>
      <p className="mt-2 text-xs text-charcoal-300">{formatWhen(notification.createdAt)}</p>

      <div className="mt-3 border-t border-charcoal-900/8 pt-3">
        <AnnouncementStatus notification={notification} />
        {needsAck && (
          <div className="mt-3">
            <Button size="sm" loading={submitting} disabled={submitting} onClick={() => acknowledge(cashier, notification.id)}>
              <CheckCircle2 className="size-4" aria-hidden /> Acknowledge
            </Button>
            {submitting && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-charcoal-500" role="status">
                <Clock3 className="size-3" aria-hidden /> Submitting…
              </p>
            )}
          </div>
        )}
        {error && !submitting && (
          <p role="alert" className="mt-2 text-sm text-danger-600">
            {needsAck ? `Could not acknowledge: ${error}` : error}
          </p>
        )}
      </div>
    </section>
  );
}
