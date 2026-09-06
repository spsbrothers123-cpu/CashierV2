import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute() {
  const { cashier, status } = useAuthStore();
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex h-dvh items-center justify-center bg-ivory-100">
        <Loader2 className="size-6 animate-spin text-egg-500" aria-label="Loading" />
      </div>
    );
  }

  if (status !== 'authenticated' || !cashier) {
    return <Navigate to="/cashier/login" state={{ from: location }} replace />;
  }

  // Backend authorization remains the final authority — this local role
  // check only prevents accidentally rendering cashier UI for a non-
  // cashier account. It is not a substitute for server-side checks.
  if (cashier.role !== 'cashier') {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-2 bg-ivory-100 px-6 text-center">
        <p className="font-display text-lg font-semibold text-charcoal-900">Not available for this account</p>
        <p className="max-w-sm text-sm text-charcoal-500">
          This account does not have cashier access. Log in with a cashier account, or contact your shop admin.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
