import { UserRound, Info } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export function ProfilePage() {
  const cashier = useAuthStore((s) => s.cashier);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="font-display text-xl font-bold text-charcoal-900 sm:text-2xl">Profile</h1>

      <div className="mt-6 rounded-card border border-charcoal-900/8 bg-surface-white p-5 shadow-soft">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-full bg-egg-300/30 text-xl font-semibold text-egg-600">
            {cashier?.name?.[0]?.toUpperCase() || <UserRound className="size-6" />}
          </div>
          <div>
            <p className="font-display text-base font-semibold text-charcoal-900">{cashier?.name}</p>
            <p className="text-sm capitalize text-charcoal-400">{cashier?.role}</p>
          </div>
        </div>

        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between border-t border-charcoal-900/6 pt-2.5">
            <dt className="text-charcoal-500">Name</dt>
            <dd className="font-medium text-charcoal-900">{cashier?.name}</dd>
          </div>
          <div className="flex justify-between border-t border-charcoal-900/6 pt-2.5">
            <dt className="text-charcoal-500">Email</dt>
            <dd className="font-medium text-charcoal-900">{cashier?.email}</dd>
          </div>
          <div className="flex justify-between border-t border-charcoal-900/6 pt-2.5">
            <dt className="text-charcoal-500">Role</dt>
            <dd className="font-medium capitalize text-charcoal-900">{cashier?.role}</dd>
          </div>
          <div className="flex justify-between border-t border-charcoal-900/6 pt-2.5">
            <dt className="text-charcoal-500">Shop</dt>
            <dd className="font-medium text-charcoal-900">{cashier?.shop?.name}</dd>
          </div>
        </dl>

        <div className="mt-5 flex items-start gap-2 rounded-[10px] bg-charcoal-900/4 px-3 py-2.5 text-xs text-charcoal-500">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {/* BACKEND ENDPOINT REQUIRED: no profile-update endpoint is documented
              yet (e.g. PATCH /auth/me), so fields stay read-only rather than
              faking an edit that wouldn't actually persist. */}
          <span>Profile editing isn&apos;t available yet. Contact your shop admin to update these details.</span>
        </div>
      </div>
    </div>
  );
}
