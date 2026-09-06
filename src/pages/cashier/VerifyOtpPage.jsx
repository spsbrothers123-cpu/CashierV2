import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MailCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CashierAuthLayout } from '@/components/auth/CashierAuthLayout';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { SignupProgress } from '@/components/auth/SignupProgress';
import { OtpInput } from '@/components/auth/OtpInput';
import { ResendOtpTimer } from '@/components/auth/ResendOtpTimer';
import { useSignupStore } from '@/store/signupStore';
import { verifySignupOtp, resendSignupOtp } from '@/api/auth';
import { maskEmail } from '@/utils/format';

const DEFAULT_RESEND_COOLDOWN = 45;
const SUCCESS_TRANSITION_MS = 900;

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const { requestId, email, markVerified } = useSignupStore();

  const [code, setCode] = useState('');
  const [otpError, setOtpError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(DEFAULT_RESEND_COOLDOWN);

  // Landed here without an active signup request (direct link / refresh) — start over.
  if (!requestId) {
    return <Navigate to="/cashier/signup" replace />;
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (code.length !== 6 || verifying) return;

    setVerifying(true);
    setOtpError(null);
    try {
      await verifySignupOtp({ requestId, code });
      setVerified(true);
      markVerified();
      setTimeout(() => navigate('/cashier/signup/pending'), SUCCESS_TRANSITION_MS);
    } catch (err) {
      setOtpError(err?.message || 'Invalid verification code. Please try again.');
      setVerifying(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setOtpError(null);
    try {
      const res = await resendSignupOtp({ requestId });
      setCode('');
      setCooldownSeconds(res.resendCooldownSeconds || DEFAULT_RESEND_COOLDOWN);
    } catch (err) {
      setOtpError(err?.message || 'Unable to resend code.');
    } finally {
      setResending(false);
    }
  }

  if (verified) {
    return (
      <CashierAuthLayout>
        <SignupProgress step="approval" />
        <div className="flex flex-col items-center rounded-card border border-charcoal-900/8 bg-surface-white p-8 text-center shadow-soft">
          <CheckCircle2 className="size-12 text-success-600" strokeWidth={1.5} aria-hidden />
          <p className="mt-4 font-display text-lg font-semibold text-charcoal-900">Email verified successfully.</p>
        </div>
      </CashierAuthLayout>
    );
  }

  return (
    <CashierAuthLayout>
      <SignupProgress step="verify" />
      <AuthHeader
        icon={MailCheck}
        title="Verify Your Email"
        subtitle={
          <>
            We've sent a verification code to your email.
            <br />
            <span className="font-medium text-charcoal-700">{maskEmail(email)}</span>
          </>
        }
      />

      <form onSubmit={handleVerify} className="rounded-card border border-charcoal-900/8 bg-surface-white p-6 shadow-soft">
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (otpError) setOtpError(null);
          }}
          disabled={verifying}
          error={otpError}
          status={otpError ? 'error' : 'idle'}
        />

        <Button type="submit" loading={verifying} disabled={code.length !== 6} className="mt-6 w-full" size="lg">
          {verifying ? 'Verifying...' : 'Verify & Continue'}
        </Button>

        <div className="mt-5">
          <ResendOtpTimer cooldownSeconds={cooldownSeconds} onResend={handleResend} resending={resending} />
        </div>
      </form>
    </CashierAuthLayout>
  );
}
