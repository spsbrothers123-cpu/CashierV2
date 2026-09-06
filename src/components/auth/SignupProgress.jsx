import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

const STEPS = [
  { key: 'invite', label: 'Invite' },
  { key: 'account', label: 'Account' },
  { key: 'verify', label: 'Verify' },
  { key: 'approval', label: 'Approval' },
];

/**
 * Subtle 4-step progress indicator: Invite -> Account -> Verify -> Approval.
 * `step` is the current step key; steps before it render as completed.
 */
export function SignupProgress({ step, className }) {
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <ol className={cn('mb-7 flex items-center justify-center', className)}>
      {STEPS.map((s, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <li key={s.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-150',
                  isComplete && 'bg-egg-400 text-charcoal-900',
                  isCurrent && !isComplete && 'bg-charcoal-900 text-ivory-50',
                  !isComplete && !isCurrent && 'bg-charcoal-900/8 text-charcoal-300'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isComplete ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium',
                  isCurrent ? 'text-charcoal-800' : 'text-charcoal-300'
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-2.5 mb-4 h-px w-8 transition-colors duration-150 sm:w-12',
                  isComplete ? 'bg-egg-400' : 'bg-charcoal-900/10'
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
