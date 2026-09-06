import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/utils/cn';

export function ErrorState({ message, onRetry, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-danger-500/10 text-danger-600">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h3 className="font-display text-base font-semibold text-charcoal-900">Something went wrong</h3>
      <p className="mt-1.5 max-w-sm text-sm text-charcoal-500">
        {message || 'Please try again.'}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RotateCcw className="size-4" /> Try again
        </Button>
      )}
    </div>
  );
}
