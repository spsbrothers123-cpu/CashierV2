import { Link } from 'react-router-dom';
import { Boxes, ShieldCheck, Clock, Megaphone, Wallet, Trash2, ExternalLink, Mail, MailOpen } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/store/notificationStore';
import { CATEGORY_LABELS } from '@/types/notifications';
import { formatWhen, routeForTarget } from '@/utils/notificationRoutes';
import { cn } from '@/utils/cn';

const ICONS = { inventory: Boxes, account_security: ShieldCheck, session: Clock, announcement: Megaphone, credit: Wallet };
const SEVERITY_TONE = { info: 'neutral', warning: 'warning', critical: 'danger' };

function PendingAckBadge({ n }) {
  const a = n.announcement;
  if (!a?.requiresAcknowledgement) return null;
  return a.acknowledgedAt ? <Badge tone="success">Acknowledged</Badge> : <Badge tone="warning">Acknowledgement pending</Badge>;
}

/**
 * variant "dropdown": compact row; clicking the body calls onOpen (which only
 * navigates/opens details — it never marks the notification read).
 * variant "page": full row with explicit manual actions.
 */
export function NotificationItem({ notification: n, cashier, variant = 'page', onOpen }) {
  const pending = useNotificationStore((s) => s.pending[n.id]);
  const error = useNotificationStore((s) => s.actionErrors[n.id]);
  const setRead = useNotificationStore((s) => s.setRead);
  const remove = useNotificationStore((s) => s.remove);
  const Icon = ICONS[n.category] || Megaphone;
  const unread = !n.readAt;
  const route = routeForTarget(n.target);
  const busy = !!pending;
  const canDelete = n.capabilities?.canDelete === true;

  const body = (
    <>
      <span
        className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', unread ? 'bg-egg-300/30 text-egg-600' : 'bg-charcoal-900/6 text-charcoal-300')}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          {unread && <span className="size-2 shrink-0 rounded-full bg-egg-500" aria-hidden />}
          <span className={cn('truncate text-sm text-charcoal-900', unread ? 'font-semibold' : 'font-medium')}>{n.title}</span>
          <span className="sr-only">{unread ? '(unread)' : '(read)'}</span>
        </span>
        <span className={cn('mt-0.5 block text-xs text-charcoal-500', variant === 'dropdown' && 'line-clamp-2')}>{n.message}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-charcoal-300">{formatWhen(n.createdAt)}</span>
          {variant === 'page' && <Badge tone="neutral">{CATEGORY_LABELS[n.category] || n.category}</Badge>}
          {n.severity && n.severity !== 'info' && <Badge tone={SEVERITY_TONE[n.severity]}>{n.severity}</Badge>}
          <PendingAckBadge n={n} />
        </span>
      </span>
    </>
  );

  if (variant === 'dropdown') {
    return (
      <li className={cn('flex items-start gap-1 border-b border-charcoal-900/6 last:border-0', unread && 'bg-egg-300/10')}>
        <button type="button" onClick={() => onOpen?.(n)} className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 hover:bg-charcoal-900/4" aria-label={`Open notification: ${n.title}`}>
          {body}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setRead(cashier, n.id, unread)}
          aria-label={unread ? `Mark "${n.title}" as read` : `Mark "${n.title}" as unread`}
          className="mt-3 mr-2 rounded-[8px] p-1.5 text-charcoal-300 hover:bg-charcoal-900/5 hover:text-charcoal-700 disabled:opacity-40"
        >
          {unread ? <MailOpen className="size-4" aria-hidden /> : <Mail className="size-4" aria-hidden />}
        </button>
      </li>
    );
  }

  return (
    <li className={cn('rounded-card border border-charcoal-900/8 bg-surface-white p-3 shadow-soft sm:p-4', unread && 'border-egg-400/50')}>
      <div className="flex items-start gap-3">{body}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 pl-11">
        <Button size="sm" variant="outline" onClick={() => onOpen?.(n)}>
          View details
        </Button>
        <Button size="sm" variant="ghost" loading={pending === 'read'} disabled={busy} onClick={() => setRead(cashier, n.id, unread)}>
          {unread ? 'Mark as read' : 'Mark as unread'}
        </Button>
        {route && (
          <Link to={route} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-sm font-medium text-egg-600 hover:bg-charcoal-900/5">
            <ExternalLink className="size-4" aria-hidden /> Open record
          </Link>
        )}
        {canDelete && (
          <Button size="sm" variant="ghost" loading={pending === 'delete'} disabled={busy} onClick={() => remove(cashier, n.id)} aria-label={`Delete "${n.title}"`}>
            <Trash2 className="size-4" aria-hidden /> Delete
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 pl-11 text-sm text-danger-600">
          {error}
        </p>
      )}
    </li>
  );
}
