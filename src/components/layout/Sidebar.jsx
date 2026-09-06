import { NavLink } from 'react-router-dom';
import {
  Egg,
  ReceiptText,
  Package,
  BarChart3,
  History,
  Clock,
  Settings,
  UserRound,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { to: '/cashier/billing', label: 'Billing', icon: ReceiptText },
  { to: '/cashier/inventory', label: 'Inventory', icon: Package },
  { to: '/cashier/reports', label: 'Reports', icon: BarChart3 },
  { to: '/cashier/history', label: 'History', icon: History },
  { to: '/cashier/sessions', label: 'Sessions', icon: Clock },
  { to: '/cashier/settings', label: 'Settings', icon: Settings },
  { to: '/cashier/profile', label: 'Profile', icon: UserRound },
];

export function Sidebar({ collapsed, onToggleCollapsed, cashier, onLogout }) {
  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col bg-charcoal-900 text-ivory-50 transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[76px]' : 'w-64'
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-egg-400 text-charcoal-900">
          <Egg className="size-5" aria-hidden fill="currentColor" strokeWidth={1.5} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-tight">Egg Mart</p>
            <p className="text-xs text-ivory-50/50">Cashier Panel</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Cashier navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-egg-400 text-charcoal-900'
                  : 'text-ivory-50/70 hover:bg-white/8 hover:text-ivory-50'
              )
            }
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onToggleCollapsed}
        className="mx-3 mb-2 flex items-center gap-3 rounded-[10px] px-3 py-2 text-xs text-ivory-50/50 hover:bg-white/8 hover:text-ivory-50"
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        {!collapsed && <span>Collapse</span>}
      </button>

      <div className="border-t border-white/10 p-3">
        <div className={cn('flex items-center gap-2.5 rounded-[10px] px-2 py-2', !collapsed && 'mb-1')}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
            {cashier?.name?.[0]?.toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{cashier?.name || 'Cashier'}</p>
              <p className="truncate text-xs capitalize text-ivory-50/50">{cashier?.role || ''}</p>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-sm text-ivory-50/70 hover:bg-white/8 hover:text-ivory-50"
        >
          <LogOut className="size-[18px]" aria-hidden />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
