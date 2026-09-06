import { cn } from '@/utils/cn';

const TONES = {
  neutral: 'bg-charcoal-900/6 text-charcoal-600',
  success: 'bg-success-600/12 text-success-600',
  warning: 'bg-warning-500/15 text-warning-600',
  danger: 'bg-danger-500/12 text-danger-600',
  primary: 'bg-egg-300/30 text-egg-600',
};

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
