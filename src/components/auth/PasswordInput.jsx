import { useState } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import { getPasswordChecks, getPasswordStrength } from '@/utils/authValidation';

const STRENGTH_COLOR = {
  Weak: 'bg-danger-500',
  Fair: 'bg-warning-500',
  Strong: 'bg-success-600',
};

/**
 * Password field with a show/hide toggle, and — only for the primary
 * password field (showRequirements) — a live strength meter and
 * requirement checklist. The confirm-password field reuses this same
 * component with showRequirements={false} to avoid duplicating the toggle.
 */
export function PasswordInput({ value, onChange, label, name, autoComplete, error, disabled, placeholder, showRequirements = false }) {
  const [visible, setVisible] = useState(false);
  const checks = showRequirements ? getPasswordChecks(value) : null;
  const strength = showRequirements ? getPasswordStrength(value) : null;

  return (
    <div>
      <Input
        label={label}
        type={visible ? 'text' : 'password'}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder || '••••••••'}
        disabled={disabled}
        error={error}
        required
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-charcoal-500 hover:text-charcoal-800"
      >
        {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {visible ? 'Hide password' : 'Show password'}
      </button>

      {showRequirements && value && (
        <div className="mt-2.5 space-y-2">
          <div className="flex h-1 gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-full transition-colors duration-150',
                  i < strength.score ? STRENGTH_COLOR[strength.label] : 'bg-charcoal-900/8'
                )}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            <RequirementChip met={checks.minLength}>8+ characters</RequirementChip>
            <RequirementChip met={checks.hasLetter}>A letter</RequirementChip>
            <RequirementChip met={checks.hasNumber}>A number</RequirementChip>
          </ul>
        </div>
      )}
    </div>
  );
}

function RequirementChip({ met, children }) {
  return (
    <li className={cn('flex items-center gap-1 text-xs', met ? 'text-success-600' : 'text-charcoal-300')}>
      <span
        className={cn(
          'flex size-3.5 items-center justify-center rounded-full',
          met ? 'bg-success-600/15' : 'bg-charcoal-900/6'
        )}
      >
        {met && <Check className="size-2.5" strokeWidth={3} />}
      </span>
      {children}
    </li>
  );
}
