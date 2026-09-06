import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { StartSessionForm } from '@/components/session/StartSessionForm';
import { SessionCard } from '@/components/session/SessionCard';
import { ClosedSessionSummary } from '@/components/session/ClosedSessionSummary';
import { CloseSessionForm } from '@/components/session/CloseSessionForm';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { useToast } from '@/components/ui/Toast';

export function SessionsPage() {
  const cashier = useAuthStore((s) => s.cashier);
  const { session, status, error, closing, loadSession, startSession, closeSession } = useSessionStore();
  const { push } = useToast();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeError, setCloseError] = useState(null);
  const [showStartForm, setShowStartForm] = useState(false);

  useEffect(() => {
    if (cashier?.id) loadSession(cashier.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashier?.id]);

  async function handleStart(openingCash) {
    setStarting(true);
    setStartError(null);
    const result = await startSession({
      cashierId: cashier.id,
      shopId: cashier.shop.id,
      openingCash,
    });
    setStarting(false);
    if (result.ok) {
      setShowStartForm(false);
    } else {
      setStartError(result.error);
    }
  }

  async function handleConfirmClose(actualClosingCash) {
    setCloseError(null);
    const result = await closeSession({ cashierId: cashier.id, actualClosingCash });
    if (result.ok) {
      setCloseOpen(false);
      push('Session closed.', 'success');
    } else {
      setCloseError(result.error);
    }
  }

  const isActive = session?.status === 'active';
  const isClosed = session?.status === 'closed';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {status === 'loading' && !session && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-egg-500" aria-label="Loading session" />
        </div>
      )}

      {status === 'error' && (
        <ErrorState message={error?.message} onRetry={() => loadSession(cashier.id)} />
      )}

      {status !== 'error' && status !== 'idle' && (
        <>
          {isActive && (
            <SessionCard session={session} cashier={cashier} onCloseSession={() => setCloseOpen(true)} />
          )}

          {isClosed && !showStartForm && (
            <ClosedSessionSummary session={session} onStartNew={() => setShowStartForm(true)} />
          )}

          {(!session || (isClosed && showStartForm)) && (
            <StartSessionForm cashier={cashier} onStart={handleStart} submitting={starting} error={startError} />
          )}
        </>
      )}

      <CloseSessionForm
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        session={session}
        submitting={closing}
        error={closeError}
        onConfirm={handleConfirmClose}
      />
    </div>
  );
}
