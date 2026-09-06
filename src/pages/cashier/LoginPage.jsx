import { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Egg, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const { cashier, status, login } = useAuthStore();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  if (status === 'authenticated' && cashier) {
    const redirectTo = location.state?.from?.pathname || '/cashier/billing';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.error?.message || 'Login failed. Please try again.');
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
          <p className="mt-1 text-sm text-charcoal-500">Cashier Login</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="rounded-card border border-charcoal-900/8 bg-surface-white p-6 shadow-soft">
          <div className="space-y-4">
            <Input
              label="Email or username"
              type="text"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@eggmart.test"
              disabled={submitting}
              required
            />
            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
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
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm text-charcoal-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-charcoal-900/20 accent-egg-500"
                />
                Remember me
              </label>
              <button type="button" className="text-sm font-medium text-egg-600 hover:underline">
                Forgot password?
              </button>
            </div>
          </div>

          {formError && (
            <div className="mt-4 flex items-start gap-2 rounded-[10px] bg-danger-500/10 px-3 py-2.5 text-sm text-danger-600">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{formError}</span>
            </div>
          )}

          <Button type="submit" loading={submitting} className="mt-6 w-full" size="lg">
            Log in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-charcoal-500">
          New cashier?{' '}
          <Link to="/cashier/signup" className="font-semibold text-egg-600 hover:underline">
            Create Cashier Account
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-charcoal-300">
          Trouble signing in? Contact your shop administrator.
        </p>
      </div>
    </div>
  );
}
