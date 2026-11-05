import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CashierAuthLayout } from '@/components/auth/CashierAuthLayout';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { SignupProgress } from '@/components/auth/SignupProgress';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useSignupStore } from '@/store/signupStore';
import { signup, getBranches } from '@/api/auth';
import { isValidEmail, isPasswordValid } from '@/utils/authValidation';

export function SignupPage() {
  const navigate = useNavigate();
  const invitationVerified = useSignupStore((s) => s.invitationVerified);
  const verificationToken = useSignupStore((s) => s.verificationToken);
  const shopId = useSignupStore((s) => s.shopId);
  const setShopId = useSignupStore((s) => s.setShopId);
  const startSignupRequest = useSignupStore((s) => s.startSignupRequest);

  const [fields, setFields] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branchesStatus, setBranchesStatus] = useState('loading'); // loading | success | error

  // Branches come from the backend (GET /auth/branches) — never typed in.
  const applyBranches = useCallback((rows) => {
    setBranches(Array.isArray(rows) ? rows : []);
    setBranchesStatus('success');
  }, []);

  // Reloaded after a branch conflict and by the Retry button.
  const loadBranches = useCallback(() => {
    setBranchesStatus('loading');
    return getBranches()
      .then(applyBranches)
      .catch(() => setBranchesStatus('error'));
  }, [applyBranches]);

  useEffect(() => {
    let cancelled = false;
    getBranches()
      .then((rows) => {
        if (!cancelled) applyBranches(rows);
      })
      .catch(() => {
        if (!cancelled) setBranchesStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [applyBranches]);

  const hasNoBranches = branchesStatus === 'success' && branches.length === 0;
  const allBranchesTaken =
    branchesStatus === 'success' && branches.length > 0 && branches.every((b) => !b.available);

  // A cashier can only reach Account Details after their invitation code has
  // been verified — direct link / refresh / back-button lands here otherwise.
  if (!invitationVerified) {
    return <Navigate to="/cashier/signup" replace />;
  }

  function updateField(name, value) {
    setFields((f) => ({ ...f, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((e) => ({ ...e, [name]: undefined }));
  }

  function validate() {
    const errors = {};
    if (!fields.name.trim()) errors.name = 'Please enter your name.';
    if (!fields.email.trim()) errors.email = 'Please enter your email.';
    else if (!isValidEmail(fields.email)) errors.email = 'Enter a valid email address.';
    if (!shopId) errors.shopId = 'Please select your branch.';
    if (!fields.password) errors.password = 'Please enter a password.';
    else if (!isPasswordValid(fields.password)) errors.password = 'Password does not meet the requirements.';
    if (!fields.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
    else if (fields.confirmPassword !== fields.password) errors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const { requestId, email } = await signup({
        name: fields.name.trim(),
        email: fields.email.trim(),
        password: fields.password,
        shopId,
        verificationToken,
      });
      startSignupRequest({ requestId, name: fields.name.trim(), email });
      navigate('/cashier/signup/pending');
    } catch (err) {
      if (err?.code === 'BRANCH_HAS_CASHIER' || err?.code === 'BRANCH_NOT_FOUND') {
        // The branch list was stale: someone took the branch (or it no longer
        // exists) after this page loaded. Clear the selection and refresh the
        // list; the other fields the cashier typed are kept.
        setShopId('');
        setFormError(
          err.code === 'BRANCH_HAS_CASHIER'
            ? 'That branch already has a cashier. Please choose another branch.'
            : 'That branch is no longer available. Please choose another branch.'
        );
        loadBranches();
      } else {
        setFormError(err?.message || 'Unable to create signup request.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CashierAuthLayout>
      <SignupProgress step="account" />
      <AuthHeader icon={UserPlus} title="Create Cashier Account" subtitle="Create your account and submit your request for admin approval." />

      <form onSubmit={handleSubmit} noValidate className="rounded-card border border-charcoal-900/8 bg-surface-white p-6 shadow-soft">
        <div className="space-y-4">
          <Input
            label="Full name"
            type="text"
            name="name"
            autoComplete="name"
            value={fields.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Your full name"
            error={fieldErrors.name}
            disabled={submitting}
            required
          />
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            value={fields.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="you@eggmart.test"
            error={fieldErrors.email}
            disabled={submitting}
            required
          />
          <div>
            <Select
              label="Branch"
              name="shopId"
              value={shopId}
              onChange={(e) => {
                setShopId(e.target.value);
                if (fieldErrors.shopId) setFieldErrors((err) => ({ ...err, shopId: undefined }));
              }}
              disabled={submitting || branchesStatus !== 'success'}
              required
            >
              <option value="">
                {branchesStatus === 'loading' ? 'Loading branches…' : 'Select your branch…'}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} disabled={!b.available}>
                  {b.name}
                  {b.location && b.location !== b.name ? ` — ${b.location}` : ''}
                  {!b.available ? ' (already has a cashier)' : ''}
                </option>
              ))}
            </Select>
            {fieldErrors.shopId ? (
              <p className="mt-1.5 text-sm text-danger-600">{fieldErrors.shopId}</p>
            ) : branchesStatus === 'error' ? (
              <div className="mt-1.5 flex items-center gap-3 text-sm text-danger-600">
                <span>Couldn't load branches. Check your connection and try again.</span>
                <Button type="button" variant="outline" size="sm" onClick={loadBranches}>
                  Retry
                </Button>
              </div>
            ) : hasNoBranches ? (
              <p className="mt-1.5 text-sm text-danger-600">
                No branches have been set up yet. Please ask your administrator to create your branch.
              </p>
            ) : allBranchesTaken ? (
              <p className="mt-1.5 text-sm text-danger-600">
                Every branch already has a cashier. Please ask your administrator.
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-charcoal-400">
                Each branch has one cashier. Ask the administrator if your branch is missing.
              </p>
            )}
          </div>
          <PasswordInput
            label="Password"
            name="password"
            autoComplete="new-password"
            value={fields.password}
            onChange={(e) => updateField('password', e.target.value)}
            error={fieldErrors.password}
            disabled={submitting}
            showRequirements
          />
          <PasswordInput
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            value={fields.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
            error={fieldErrors.confirmPassword}
            disabled={submitting}
          />
        </div>

        {formError && (
          <div className="mt-4 flex items-start gap-2 rounded-[10px] bg-danger-500/10 px-3 py-2.5 text-sm text-danger-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <Button type="submit" loading={submitting} className="mt-6 w-full" size="lg">
          {submitting ? 'Submitting Request...' : 'Create Account'}
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
