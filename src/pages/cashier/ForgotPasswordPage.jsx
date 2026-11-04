import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Egg, CheckCircle2, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { requestCashierRecovery, resetCashierPassword } from '@/api/auth';
import { isPasswordValid, isValidEmail } from '@/utils/authValidation';

const REQUEST_TTL_MS = 15 * 60_000;

const GENERIC_REQUEST_NOTICE =
  'If this account is eligible, a recovery request has been sent to your administrator.';

/**
 * Cashier Forgot Password — admin-assisted recovery.
 *
 *   request -> (visit the administrator in person) -> code + new password -> done
 *
 * Everything lives in React state ONLY. The recovery code and passwords are
 * never put in the URL, localStorage/sessionStorage, or console, and are
 * cleared as soon as the reset succeeds. Nothing here reveals whether an
 * account exists: the "request sent" screen is the same for every email.
 */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // request | code | done
  const [email, setEmail] = useState('');
  const [submittedAt, setSubmittedAt] = useState(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const now = useNow(step === 'code' && submittedAt !== null);
  // `now` can lag by up to a second right after submit, so never show more than the full 15 minutes.
  const remainingMs =
    submittedAt !== null ? Math.min(REQUEST_TTL_MS, Math.max(0, submittedAt + REQUEST_TTL_MS - now)) : null;
  const expired = remainingMs === 0;

  function resetToRequest() {
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setFormError(null);
    setFieldErrors({});
    setSubmittedAt(null);
    setStep('request');
  }

  async function handleRequest(e) {
    e.preventDefault();
    setFormError(null);
    if (!isValidEmail(email)) {
      setFieldErrors({ email: 'Enter your registered email.' });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await requestCashierRecovery({ email: email.trim() });
      setSubmittedAt(Date.now());
      setStep('code');
    } catch (err) {
      setFormError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setFormError(null);

    const errors = {};
    if (!isValidEmail(email)) errors.email = 'Enter your registered email.';
    if (code.replace(/[\s-]/g, '').length < 8) errors.code = 'Enter the recovery code your administrator gave you.';
    if (!isPasswordValid(password)) errors.password = 'Use at least 8 characters, with a letter and a number.';
    if (password !== confirmPassword) errors.confirmPassword = "Passwords don't match.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await resetCashierPassword({ email: email.trim(), code: code.trim(), newPassword: password });
      // Drop every secret from memory before showing the success screen.
      setCode('');
      setPassword('');
      setConfirmPassword('');
      setStep('done');
    } catch (err) {
      setFormError(messageForResetFailure(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ivory-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-egg-400 text-charcoal-900 shadow-soft">
            <Egg className="size-7" fill="currentColor" strokeWidth={1.5} aria-hidden />
          </div>
          <h1 className="font-display text-2xl font-bold text-charcoal-900">Egg Mart</h1>
          <p className="mt-1 text-sm text-charcoal-500">Cashier Password Recovery</p>
        </div>

        <div className="rounded-card border border-charcoal-900/8 bg-surface-white p-6 shadow-soft">
          {step === 'request' && (
            <form onSubmit={handleRequest} noValidate className="space-y-4">
              <p className="text-sm text-charcoal-500">
                Enter the email you signed up with. Your administrator will verify who you are in person and give you a
                one-time recovery code.
              </p>
              <Input
                label="Registered email"
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@eggmart.test"
                disabled={submitting}
                error={fieldErrors.email}
                required
              />

              <FormError message={formError} />

              <Button type="submit" loading={submitting} className="w-full" size="lg">
                Request recovery
              </Button>

              <div className="flex items-center justify-between gap-3">
                <Link
                  to="/cashier/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-500 hover:text-charcoal-800"
                >
                  <ArrowLeft className="size-3.5" /> Back to login
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setFieldErrors({});
                    setStep('code');
                  }}
                  className="text-sm font-semibold text-egg-600 hover:underline"
                >
                  I have a code
                </button>
              </div>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleReset} noValidate className="space-y-4">
              {submittedAt !== null && (
                <div className="rounded-[10px] bg-egg-400/15 px-3.5 py-3 text-sm text-charcoal-800">
                  <p className="font-semibold">{GENERIC_REQUEST_NOTICE}</p>
                  <p className="mt-1 text-charcoal-500">
                    Go to your administrator now so they can verify you in person. Then enter the code they give you below.
                  </p>
                  <p
                    className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${
                      expired ? 'text-danger-600' : 'text-charcoal-500'
                    }`}
                  >
                    <Clock className="size-3.5" aria-hidden />
                    {expired ? 'This request has expired.' : `Expires in about ${formatMmSs(remainingMs)}`}
                  </p>
                </div>
              )}

              {expired ? (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-charcoal-500">
                    Recovery requests last 15 minutes. Submit a new request to get a fresh code.
                  </p>
                  <Button type="button" className="w-full" size="lg" onClick={resetToRequest}>
                    Submit a new request
                  </Button>
                </div>
              ) : (
                <>
                  {submittedAt === null && (
                    <p className="text-sm text-charcoal-500">
                      Enter the one-time code your administrator gave you, then choose a new password.
                    </p>
                  )}

                  <Input
                    label="Registered email"
                    type="email"
                    name="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@eggmart.test"
                    disabled={submitting}
                    error={fieldErrors.email}
                    required
                  />

                  <Input
                    label="Recovery code"
                    type="text"
                    name="recovery-code"
                    autoComplete="off"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={64}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX-…"
                    className="font-mono tracking-wider"
                    disabled={submitting}
                    error={fieldErrors.code}
                    hint="Works once. Your administrator gives it to you in person."
                    required
                  />

                  <PasswordInput
                    label="New password"
                    name="newPassword"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    error={fieldErrors.password}
                    showRequirements
                  />

                  <PasswordInput
                    label="Confirm new password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                    error={fieldErrors.confirmPassword}
                  />

                  <FormError message={formError} />

                  <Button type="submit" loading={submitting} className="w-full" size="lg">
                    <ShieldCheck className="size-4" aria-hidden /> Reset password
                  </Button>
                </>
              )}

              <div className="flex items-center justify-between gap-3">
                <Link
                  to="/cashier/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-500 hover:text-charcoal-800"
                >
                  <ArrowLeft className="size-3.5" /> Back to login
                </Link>
                {!expired && (
                  <button type="button" onClick={resetToRequest} className="text-sm font-semibold text-egg-600 hover:underline">
                    New request
                  </button>
                )}
              </div>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-3 size-9 text-success-600" />
              <h2 className="font-display text-lg font-bold text-charcoal-900">Password reset</h2>
              <p className="mt-1 text-sm text-charcoal-500">
                Your password has been changed and you've been signed out everywhere. Log in with your new password.
              </p>
              <Button className="mt-5 w-full" size="lg" onClick={() => navigate('/cashier/login', { replace: true })}>
                Go to login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormError({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-[10px] bg-danger-500/10 px-3 py-2.5 text-sm text-danger-600">
      <span>{message}</span>
    </div>
  );
}

/** Ticks once a second while `active`; otherwise stays still. */
function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function formatMmSs(ms) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Every verification failure is the same server answer on purpose, so this
 * message must not hint at WHICH thing was wrong (email, code, expiry…).
 */
function messageForResetFailure(err) {
  switch (err?.code) {
    case 'RECOVERY_VERIFICATION_FAILED':
      return "We couldn't verify that. Check your email and code, or submit a new request — a code works once and the request expires 15 minutes after it was made.";
    case 'RECOVERY_THROTTLED':
      return err.message || 'Too many attempts. Please wait a bit and try again.';
    case 'RECOVERY_NOT_CONFIGURED':
      return 'Password recovery is not available right now. Please contact your administrator.';
    default:
      return err?.message || 'Something went wrong. Please try again.';
  }
}
