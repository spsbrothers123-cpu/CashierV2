import { useEffect, useState } from 'react';
import { Menu, User } from 'lucide-react';
import { cn } from '@/utils/cn';

export function TopHeader({ shop, session, cashier, onOpenDrawer }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const isActive = session?.status === 'active';
  const dateTimeLabel = now.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-charcoal-900/8 bg-surface px-4 sm:px-6">
      <button
        onClick={onOpenDrawer}
        aria-label="Open menu"
        className="rounded-[10px] p-2 text-charcoal-700 hover:bg-charcoal-900/5 lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate font-display text-sm font-semibold text-charcoal-900 sm:text-base">
            {shop?.name || 'Shop'}
          </span>
          <span className="text-charcoal-300">•</span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium sm:text-sm',
              isActive ? 'text-success-600' : 'text-charcoal-300'
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                isActive ? 'animate-pulse bg-success-600' : 'bg-charcoal-300'
              )}
              aria-hidden
            />
            Session {isActive ? 'Active' : 'Not started'}
          </span>
        </div>
        <p className="hidden text-xs text-charcoal-300 sm:block">{dateTimeLabel}</p>
      </div>

      <div className="hidden text-right text-xs text-charcoal-300 sm:block">
        <p className="font-medium text-charcoal-700">{cashier?.name}</p>
      </div>

      <div className="flex size-9 items-center justify-center rounded-full bg-charcoal-900/6 text-charcoal-700">
        <User className="size-4" aria-hidden />
      </div>
    </header>
  );
}
