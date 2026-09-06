import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CashierAuthLayout } from '@/components/auth/CashierAuthLayout';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { SignupProgress } from '@/components/auth/SignupProgress';
import { InvitationCodeInput } from '@/components/auth/InvitationCodeInput';
import { useSignupStore } from '@/store/signupStore';
import { verifyInvitationCode } from '@/api/auth';

const CODE_LENGTH = 6;

/**
 * First step of cashier signup. A cashier can only start registration with
 * a 6-digit invitation code issued by their shop Admin — there is no email
 * OTP step. The backend is the source of truth for whether a code is valid;
 * this page never treats a code as valid on its own.
 */
export function InvitationCodePage() {
  const navigate = useNavigate();
  const markInvitationVerified = useSignupStore((s) => s.markInvitationVerified);

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  async function handleContinue(e) {
    e.preventDefault();
    if (verifying) return;

    if (!code) {
      setCodeError('Please enter your invitation code.');
      return;
    }
    if (code.length !== CODE_LENGTH) {
      setCodeError('Invitation code must be 6 digits.');
      return;
    }

    setVerifying(true);
    setCodeError(null);
    try {
      const { verificationToken } = await verifyInvitationCode({ code });
      markInvitationVerified({ verificationToken });
      navigate('/cashier/signup/account');
    } catch (err) {
      setCodeError(err?.message || 'Invalid invitation code.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <CashierAuthLayout>
      <SignupProgress step="invite" />
      <AuthHeader
        icon={KeyRound}
        title="Cashier Registration"
        subtitle="Enter the 6-digit invitation code provided by your Admin."
      />

      <form
        onSubmit={handleContinue}
        noValidate
        className="rounded-card border border-charcoal-900/8 bg-surface-white p-6 shadow-soft"
      >
        <InvitationCodeInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (codeError) setCodeError(null);
          }}
          disabled={verifying}
          error={codeError}
          status={codeError ? 'error' : 'idle'}
        />

        <Button
          type="submit"
          loading={verifying}
          disabled={code.length !== CODE_LENGTH}
          className="mt-6 w-full"
          size="lg"
        >
          {verifying ? 'Verifying...' : 'Continue'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-charcoal-500">
        Already have an account?{' '}
        <Link to="/cashier/login" className="font-semibold text-egg-600 hover:underline">
          Sign In
        </Link>
      </p>
    </CashierAuthLayout>
  );
}
