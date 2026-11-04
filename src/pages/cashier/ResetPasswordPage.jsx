import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Egg, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { resetPassword } from '@/api/auth';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError('This reset link is missing its token. Please request a new one.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setFormError(err?.message || 'This link may have expired. Please request a new one.');
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
          <p className="mt-1 text-sm text-charcoal-500">Set a New Password</p>
        </div>

        <div className="rounded-card border border-charcoal-900/8 bg-surface-white p-6 shadow-soft">
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-3 size-9 text-success-600" />
              <h2 className="font-display text-lg font-bold text-charcoal-900">Password reset</h2>
              <p className="mt-1 text-sm text-charcoal-500">
                Your password has been changed. You can now log in with your new password.
              </p>
              <Button className="mt-5 w-full" size="lg" onClick={() => navigate('/cashier/login', { replace: true })}>
                Go to login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <Input
                  label="New password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={submitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-charcoal-500 hover:text-charcoal-800"
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {showPassword ? 'Hide password' : 'Show password'}
                </button>
                <p className="mt-1 text-xs text-charcoal-400">At least 8 characters, with a letter and a number.</p>
              </div>

              <Input
                label="Confirm new password"
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={submitting}
                required
              />

              {formError && (
                <div className="flex items-start gap-2 rounded-[10px] bg-danger-500/10 px-3 py-2.5 text-sm text-danger-600">
                  <span>{formError}</span>
                </div>
              )}

              <Button type="submit" loading={submitting} className="w-full" size="lg">
                Reset password
              </Button>

              <Link to="/cashier/login" className="inline-block text-sm font-medium text-charcoal-500 hover:text-charcoal-800">
                Back to login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
