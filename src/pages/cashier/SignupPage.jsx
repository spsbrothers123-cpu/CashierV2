import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CashierAuthLayout } from '@/components/auth/CashierAuthLayout';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { SignupProgress } from '@/components/auth/SignupProgress';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useSignupStore } from '@/store/signupStore';
import { signup } from '@/api/auth';
import { isValidEmail, isPasswordValid } from '@/utils/authValidation';

export function SignupPage() {
  const navigate = useNavigate();
  const invitationVerified = useSignupStore((s) => s.invitationVerified);
  const verificationToken = useSignupStore((s) => s.verificationToken);
  const branchName = useSignupStore((s) => s.branchName);
  const setBranchName = useSignupStore((s) => s.setBranchName);
  const startSignupRequest = useSignupStore((s) => s.startSignupRequest);

  const [fields, setFields] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (!branchName.trim()) errors.branchName = 'Please enter your branch name.';
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
        branchName: branchName.trim(),
        verificationToken,
      });
      startSignupRequest({ requestId, name: fields.name.trim(), email });
      navigate('/cashier/signup/verify');
    } catch (err) {
      setFormError(err?.message || 'Unable to create signup request.');
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
          <Input
            label="Branch Name"
            type="text"
            name="branchName"
            autoComplete="off"
            value={branchName}
            onChange={(e) => {
              setBranchName(e.target.value);
              if (fieldErrors.branchName) setFieldErrors((err) => ({ ...err, branchName: undefined }));
            }}
            placeholder="e.g. Bengaluru Central"
            hint="The shop branch you'll be working at."
            error={fieldErrors.branchName}
            disabled={submitting}
            required
          />
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
          {submitting ? 'Sending Verification Code...' : 'Create Account'}
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
