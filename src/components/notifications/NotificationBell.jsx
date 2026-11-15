import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotificationStore } from '@/store/notificationStore';
import { cn } from '@/utils/cn';

export function NotificationBell({ cashier }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useNotificationStore((s) => s.unreadCount) ?? 0;
  const loadRecent = useNotificationStore((s) => s.loadRecent);
  const cashierId = cashier?.id;

  const refresh = useCallback(() => {
    if (cashier) loadRecent(cashier);
  }, [cashier, loadRecent]);

  // Load on mount and whenever the signed-in cashier changes (store wipes
  // first if the owner differs, so nothing stale from a previous cashier shows).
  useEffect(() => {
    if (cashierId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashierId]);

  // Refetch when the tab regains focus (no background polling in this phase).
  useEffect(() => {
    if (!cashierId) return undefined;
    const onFocus = () => document.visibilityState !== 'hidden' && refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashierId]);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((o) => {
      if (!o) refresh();
      return !o;
    });
  };

  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-full text-charcoal-700 hover:bg-charcoal-900/5"
      >
        <Bell className="size-5" aria-hidden />
        {unreadCount > 0 && (
          <span
            data-testid="unread-badge"
            className={cn('absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold leading-none text-white')}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <NotificationDropdown
          cashier={cashier}
          onRefresh={refresh}
          onViewAll={() => setOpen(false)}
          onOpenItem={(n) => {
            setOpen(false);
            // Navigation only — opening never marks the notification read.
            navigate(`/cashier/notifications?open=${encodeURIComponent(n.id)}`);
          }}
        />
      )}
    </div>
  );
}
