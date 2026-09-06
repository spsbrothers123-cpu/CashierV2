import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const VARIANTS = {
  primary:
    'bg-egg-400 text-charcoal-900 hover:bg-egg-300 active:bg-egg-500 disabled:bg-egg-400/50 shadow-soft',
  dark:
    'bg-charcoal-900 text-ivory-50 hover:bg-charcoal-800 active:bg-charcoal-700 disabled:opacity-50',
  outline:
    'bg-transparent text-charcoal-900 border border-charcoal-900/15 hover:bg-charcoal-900/5 disabled:opacity-50',
  ghost: 'bg-transparent text-charcoal-500 hover:bg-charcoal-900/5 disabled:opacity-50',
  danger: 'bg-danger-600 text-ivory-50 hover:bg-danger-500 disabled:opacity-50',
};

const SIZES = {
  sm: 'h-9 px-3 text-sm rounded-[10px]',
  md: 'h-11 px-4 text-sm rounded-[10px]',
  lg: 'h-14 px-6 text-base rounded-[12px]',
};

export const Button = forwardRef(function Button(
  { className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium font-display transition-colors duration-150 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
