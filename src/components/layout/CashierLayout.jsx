import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  ReceiptText,
  Package,
  BarChart3,
  History,
  Clock,
  Settings,
  UserRound,
  LogOut,
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { Drawer } from '@/components/ui/Drawer';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { cn } from '@/utils/cn';

const DRAWER_ITEMS = [
  { to: '/cashier/billing', label: 'Billing', icon: ReceiptText },
  { to: '/cashier/inventory', label: 'Inventory', icon: Package },
  { to: '/cashier/reports', label: 'Reports', icon: BarChart3 },
  { to: '/cashier/history', label: 'History', icon: History },
  { to: '/cashier/sessions', label: 'Sessions', icon: Clock },
  { to: '/cashier/settings', label: 'Settings', icon: Settings },
  { to: '/cashier/profile', label: 'Profile', icon: UserRound },
];

export function CashierLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cashier = useAuthStore((s) => s.cashier);
  const logout = useAuthStore((s) => s.logout);
  const session = useSessionStore((s) => s.session);

  return (
    <div className="flex h-dvh bg-ivory-100">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        cashier={cashier}
        onLogout={logout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader
          shop={cashier?.shop}
          session={session}
          cashier={cashier}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </main>
        <MobileBottomNav onOpenMore={() => setDrawerOpen(true)} />
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Egg Mart" side="left">
        <nav className="space-y-1 px-3" aria-label="Full navigation">
          {DRAWER_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium',
                  isActive ? 'bg-egg-400 text-charcoal-900' : 'text-ivory-50/70 hover:bg-white/8'
                )
              }
            >
              <Icon className="size-[18px]" aria-hidden />
              {label}
            </NavLink>
          ))}
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-ivory-50/70 hover:bg-white/8"
          >
            <LogOut className="size-[18px]" aria-hidden />
            Logout
          </button>
        </nav>
      </Drawer>
    </div>
  );
}
