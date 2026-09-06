import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';

export function SessionGate() {
  const cashier = useAuthStore((s) => s.cashier);
  const { session, status, loadSession } = useSessionStore();

  useEffect(() => {
    if (cashier?.id && status === 'idle') loadSession(cashier.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashier?.id, status]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-egg-500" aria-label="Loading" />
      </div>
    );
  }

  if (session?.status !== 'active') {
    return <Navigate to="/cashier/sessions" replace />;
  }

  return <Outlet />;
}
