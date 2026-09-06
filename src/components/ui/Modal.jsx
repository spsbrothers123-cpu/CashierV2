import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export function Modal({ open, onClose, onBackdropClick, title, children, footer, className }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-[2px]"
        onClick={onBackdropClick ?? onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 w-full max-w-lg rounded-card bg-surface-white shadow-lifted',
          'max-h-[85vh] overflow-y-auto',
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-charcoal-900/8 px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-charcoal-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-charcoal-500 hover:bg-charcoal-900/5"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="border-t border-charcoal-900/8 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
