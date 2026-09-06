import { Link } from 'react-router-dom';
import { Egg } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-ivory-100 px-6 text-center">
      <Egg className="size-10 text-egg-400" aria-hidden />
      <h1 className="font-display text-xl font-bold text-charcoal-900">Page not found</h1>
      <p className="max-w-sm text-sm text-charcoal-500">The page you're looking for doesn't exist.</p>
      <Link to="/cashier/billing">
        <Button className="mt-2">Go to Billing</Button>
      </Link>
    </div>
  );
}
