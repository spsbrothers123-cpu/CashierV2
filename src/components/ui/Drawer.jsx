import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export function Drawer({ open, onClose, side = 'left', title, children }) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity duration-200',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      )}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-charcoal-900/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute top-0 h-full w-[82%] max-w-xs bg-charcoal-900 text-ivory-50 shadow-lifted transition-transform duration-200',
          side === 'left' ? 'left-0' : 'right-0',
          open ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <span className="font-display text-lg font-semibold">{title}</span>
          <button onClick={onClose} aria-label="Close menu" className="rounded-full p-1.5 hover:bg-white/10">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
