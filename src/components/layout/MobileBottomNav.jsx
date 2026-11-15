import { NavLink } from 'react-router-dom';
import { ReceiptText, Package, Clock, Menu } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { cn } from '@/utils/cn';

const ITEMS = [
  { to: '/cashier/billing', label: 'Billing', icon: ReceiptText },
  { to: '/cashier/inventory', label: 'Inventory', icon: Package },
  { to: '/cashier/sessions', label: 'Sessions', icon: Clock },
];

export function MobileBottomNav({ onOpenMore }) {
  const unread = useNotificationStore((st) => st.unreadCount) ?? 0;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-charcoal-900/8 bg-surface-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Primary navigation"
    >
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
              isActive ? 'text-egg-600' : 'text-charcoal-300'
            )
          }
        >
          <Icon className="size-5" aria-hidden />
          {label}
        </NavLink>
      ))}
      <button
        onClick={onOpenMore}
        aria-label={unread > 0 ? `More, ${unread} unread notifications` : 'More'}
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-charcoal-300"
      >
        <span className="relative">
          <Menu className="size-5" aria-hidden />
          {unread > 0 && <span data-testid="more-unread-dot" className="absolute -right-1 -top-0.5 size-2 rounded-full bg-danger-600" aria-hidden />}
        </span>
        More
      </button>
    </nav>
  );
}
