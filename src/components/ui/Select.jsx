import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export const Select = forwardRef(function Select(
  { className, label, id, children, ...props },
  ref
) {
  const selectId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-charcoal-800">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-11 w-full appearance-none rounded-[10px] border border-charcoal-900/12 bg-surface-white px-3.5 pr-9 text-sm text-charcoal-900',
            'outline-none transition-colors duration-150 focus:border-egg-500',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-300" />
      </div>
    </div>
  );
});
