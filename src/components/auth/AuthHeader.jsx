import { cn } from '@/utils/cn';

/** Icon-in-circle + title + subtitle block reused across signup, OTP, and pending pages. */
export function AuthHeader({ icon: Icon, title, subtitle, tone = 'egg', className }) {
  const toneClasses =
    tone === 'success'
      ? 'bg-success-600/12 text-success-600'
      : 'bg-egg-400 text-charcoal-900';

  return (
    <div className={cn('mb-7 flex flex-col items-center text-center', className)}>
      {Icon && (
        <div className={cn('mb-4 flex size-14 items-center justify-center rounded-full shadow-soft', toneClasses)}>
          <Icon className="size-7" strokeWidth={1.75} aria-hidden />
        </div>
      )}
      <h1 className="font-display text-2xl font-bold text-charcoal-900">{title}</h1>
      {subtitle && <p className="mt-1.5 max-w-xs text-sm text-charcoal-500">{subtitle}</p>}
    </div>
  );
}
