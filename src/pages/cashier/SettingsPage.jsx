import { LogOut, LayoutGrid, List, Receipt, Volume2, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/utils/cn';

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-charcoal-900">{label}</p>
        {description && <p className="mt-0.5 text-xs text-charcoal-400">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-egg-400' : 'bg-charcoal-900/15'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow-soft transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { cashier, logout } = useAuthStore();
  const settings = useSettingsStore();

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="font-display text-xl font-bold text-charcoal-900 sm:text-2xl">Settings</h1>
      <p className="mt-1 text-sm text-charcoal-500">
        These preferences apply on this device only. For account details, see your{' '}
        <Link to="/cashier/profile" className="font-medium text-egg-600 underline underline-offset-2">
          profile
        </Link>
        .
      </p>

      <div className="mt-6 rounded-card border border-charcoal-900/8 bg-surface-white p-5 shadow-soft">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-egg-300/30 text-lg font-semibold text-egg-600">
            {cashier?.name?.[0]?.toUpperCase() || <UserRound className="size-5" />}
          </div>
          <div>
            <p className="font-display text-base font-semibold text-charcoal-900">{cashier?.name}</p>
            <p className="text-sm capitalize text-charcoal-400">{cashier?.role}</p>
          </div>
        </div>

        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-charcoal-400">
            <LayoutGrid className="size-3.5" /> Product Catalogue View
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => settings.setCatalogueView('grid')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border py-2.5 text-sm font-medium transition-colors',
                settings.catalogueView === 'grid'
                  ? 'border-egg-500 bg-egg-300/20 text-charcoal-900'
                  : 'border-charcoal-900/12 text-charcoal-500 hover:bg-charcoal-900/4'
              )}
            >
              <LayoutGrid className="size-4" /> Grid
            </button>
            <button
              onClick={() => settings.setCatalogueView('list')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border py-2.5 text-sm font-medium transition-colors',
                settings.catalogueView === 'list'
                  ? 'border-egg-500 bg-egg-300/20 text-charcoal-900'
                  : 'border-charcoal-900/12 text-charcoal-500 hover:bg-charcoal-900/4'
              )}
            >
              <List className="size-4" /> List
            </button>
          </div>
        </div>

        <div className="mt-5 divide-y divide-charcoal-900/6 border-t border-charcoal-900/6">
          <div className="pt-1">
            <p className="mb-0.5 mt-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-charcoal-400">
              <Receipt className="size-3.5" /> Receipt
            </p>
            <ToggleRow
              label="Auto-print receipt"
              description="Skip the preview and print automatically after payment."
              checked={settings.receiptAutoPrint}
              onChange={() => settings.toggle('receiptAutoPrint')}
            />
            <ToggleRow
              label="Show shop logo on receipt"
              checked={settings.receiptShowLogo}
              onChange={() => settings.toggle('receiptShowLogo')}
            />
          </div>

          <div>
            <p className="mb-0.5 mt-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-charcoal-400">
              <Volume2 className="size-3.5" /> Sound
            </p>
            <ToggleRow
              label="Sound on add to cart"
              checked={settings.soundOnAddToCart}
              onChange={() => settings.toggle('soundOnAddToCart')}
            />
            <ToggleRow
              label="Sound on payment success"
              checked={settings.soundOnPaymentSuccess}
              onChange={() => settings.toggle('soundOnPaymentSuccess')}
            />
          </div>
        </div>

        <Button variant="outline" className="mt-6 w-full" onClick={logout}>
          <LogOut className="size-4" /> Logout
        </Button>
      </div>
    </div>
  );
}
