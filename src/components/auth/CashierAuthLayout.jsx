import { Egg, KeyRound, ShieldCheck, Clock3, UserCheck } from 'lucide-react';

const FEATURES = [
  { icon: KeyRound, text: 'Start with the invitation code your shop admin gave you.' },
  { icon: ShieldCheck, text: 'Your email is verified before your request goes out.' },
  { icon: UserCheck, text: 'A shop admin reviews and approves every new cashier.' },
  { icon: Clock3, text: 'Takes about a minute — the rest is on your admin.' },
];

/**
 * Shared split-screen shell for the signup / OTP verification / pending
 * approval pages. Desktop shows a branded left panel; mobile collapses to
 * a single column. Login intentionally keeps its own simpler layout — see
 * LoginPage.jsx — so this is scoped to the signup flow only.
 */
export function CashierAuthLayout({ children }) {
  return (
    <div className="flex min-h-dvh bg-ivory-100">
      <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-charcoal-900 px-10 py-12 text-ivory-50 lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-egg-400/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-egg-400/5"
          aria-hidden
        />

        <div className="relative flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-egg-400 text-charcoal-900">
            <Egg className="size-5" fill="currentColor" strokeWidth={1.5} aria-hidden />
          </div>
          <span className="font-display text-lg font-bold">Egg Mart</span>
        </div>

        <div className="relative">
          <h2 className="font-display text-2xl font-bold leading-snug">
            Join your shop's
            <br />
            cashier team.
          </h2>
          <p className="mt-3 max-w-xs text-sm text-ivory-50/70">
            Enter your invite code, set up your account, verify your email, and your admin takes it from there.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-ivory-50/10">
                  <Icon className="size-3.5" aria-hidden />
                </div>
                <span className="text-sm text-ivory-50/80">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ivory-50/40">
          &copy; {new Date().getFullYear()} Egg Mart. Cashier Portal.
        </p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
