import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: 'border-success-600/20 text-success-600',
  error: 'border-danger-600/20 text-danger-600',
  warning: 'border-warning-600/20 text-warning-600',
  info: 'border-charcoal-900/15 text-charcoal-700',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info', duration = 4000) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, message, type }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'flex items-start gap-2.5 rounded-[10px] border bg-surface-white px-4 py-3 shadow-lifted',
                STYLES[t.type]
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p className="flex-1 text-sm text-charcoal-800">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-charcoal-300 hover:text-charcoal-600">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
