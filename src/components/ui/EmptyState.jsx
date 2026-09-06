import { cn } from '@/utils/cn';

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-egg-300/25 text-egg-600">
          <Icon className="size-6" aria-hidden />
        </div>
      )}
      <h3 className="font-display text-base font-semibold text-charcoal-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-charcoal-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
