import { useEffect } from 'react';
import { Lock } from 'lucide-react';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { useNotificationStore } from '@/store/notificationStore';
import { NOTIFICATION_CATEGORIES, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS } from '@/types/notifications';
import { cn } from '@/utils/cn';

export function NotificationSettingsPanel({ cashier }) {
  const { status, categories, pending, error } = useNotificationStore((s) => s.settings);
  const loadSettings = useNotificationStore((s) => s.loadSettings);
  const saveSetting = useNotificationStore((s) => s.saveSetting);

  useEffect(() => {
    if (cashier) loadSettings(cashier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashier?.id]);

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="space-y-3" role="status" aria-label="Loading settings">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (status === 'error') {
    return <ErrorState message={error?.message} onRetry={() => loadSettings(cashier)} />;
  }

  const unavailable = status === 'unavailable';
  const byCat = Object.fromEntries((categories || []).map((c) => [c.category, c]));

  return (
    <div>
      <p className="mb-3 text-sm text-charcoal-500">
        {unavailable
          ? 'Notification preferences are not available yet. Nothing here can be changed, and no preference is saved on this device.'
          : 'Preferences are saved to your account on the server. A toggle only changes after the server confirms it.'}
      </p>
      {error && status === 'ready' && (
        <p role="alert" className="mb-3 text-sm text-danger-600">
          Could not save: {error.message}
        </p>
      )}
      <ul className="divide-y divide-charcoal-900/8 rounded-card border border-charcoal-900/8 bg-surface-white shadow-soft">
        {NOTIFICATION_CATEGORIES.map((cat) => {
          const c = byCat[cat];
          const known = !unavailable && !!c;
          const editable = known && c.mutable === true;
          const saving = !!pending[cat];
          return (
            <li key={cat} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-charcoal-900">{CATEGORY_LABELS[cat]}</p>
                <p className="mt-0.5 text-xs text-charcoal-400">{CATEGORY_DESCRIPTIONS[cat]}</p>
                {unavailable && <p className="mt-1 text-xs font-medium text-charcoal-500">Unavailable</p>}
                {known && !editable && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-charcoal-500">
                    <Lock className="size-3" aria-hidden /> {c.mandatoryReason || 'Always on — this setting cannot be changed.'}
                  </p>
                )}
              </div>
              <button
                role="switch"
                aria-checked={known ? !!c.enabled : false}
                aria-label={CATEGORY_LABELS[cat]}
                disabled={!editable || saving}
                onClick={() => saveSetting(cat, !c.enabled)}
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                  known && c.enabled ? 'bg-egg-400' : 'bg-charcoal-900/15'
                )}
              >
                <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow-soft transition-transform', known && c.enabled ? 'translate-x-[22px]' : 'translate-x-0.5')} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
