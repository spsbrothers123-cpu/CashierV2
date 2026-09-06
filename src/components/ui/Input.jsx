import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export const Input = forwardRef(function Input(
  { className, label, error, hint, id, ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-charcoal-800">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-11 w-full rounded-[10px] border bg-surface-white px-3.5 text-sm text-charcoal-900 placeholder:text-charcoal-300',
          'transition-colors duration-150 outline-none',
          error
            ? 'border-danger-500 focus:border-danger-500'
            : 'border-charcoal-900/12 focus:border-egg-500',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-danger-600">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-charcoal-300">
          {hint}
        </p>
      )}
    </div>
  );
});
