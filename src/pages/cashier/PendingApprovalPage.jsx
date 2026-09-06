import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CashierAuthLayout } from '@/components/auth/CashierAuthLayout';
import { SignupProgress } from '@/components/auth/SignupProgress';
import { ApprovalStatusCard } from '@/components/auth/ApprovalStatusCard';
import { useSignupStore } from '@/store/signupStore';
import { getSignupStatus } from '@/api/auth';

export function PendingApprovalPage() {
  const navigate = useNavigate();
  const { requestId, name, email, step, reset } = useSignupStore();

  // Best-effort freshness check — the pending page still renders correctly
  // from local signup state if this fails, since no admin-approval backend
  // exists yet to actually change the status.
  useEffect(() => {
    if (!requestId) return;
    getSignupStatus({ requestId }).catch(() => {});
  }, [requestId]);

  // Reached directly without completing verification — start over.
  if (!requestId || step !== 'approval') {
    return <Navigate to="/cashier/signup" replace />;
  }

  return (
    <CashierAuthLayout>
      <SignupProgress step="approval" />

      <div className="flex flex-col items-center rounded-card border border-charcoal-900/8 bg-surface-white p-6 text-center shadow-soft">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-success-600/12 text-success-600 shadow-soft">
          <CheckCircle2 className="size-7" strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="font-display text-2xl font-bold text-charcoal-900">Request Submitted Successfully</h1>
        <p className="mt-1.5 text-sm text-charcoal-500">Your email has been verified.</p>
        <p className="mt-4 max-w-xs text-sm text-charcoal-700">
          Your cashier account is now waiting for administrator approval.
        </p>

        <div className="mt-6 w-full">
          <ApprovalStatusCard name={name} email={email} />
        </div>

        <Button
          className="mt-6 w-full"
          size="lg"
          onClick={() => {
            reset();
            navigate('/cashier/login');
          }}
        >
          Back to Login
        </Button>
        <p className="mt-4 text-xs text-charcoal-300">
          Trouble with your request? Contact your shop administrator.
        </p>
      </div>
    </CashierAuthLayout>
  );
}
