import { Badge } from '@/components/ui/Badge';

/** Read-only summary shown on the pending-approval page: name, email, status. */
export function ApprovalStatusCard({ name, email }) {
  return (
    <div className="rounded-card border border-charcoal-900/8 bg-surface-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-charcoal-500">Request status</span>
        <Badge tone="warning">Pending approval</Badge>
      </div>
      <div className="mt-4 space-y-2.5 border-t border-charcoal-900/8 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-charcoal-500">Name</span>
          <span className="font-medium text-charcoal-900">{name}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-charcoal-500">Email</span>
          <span className="font-medium text-charcoal-900">{email}</span>
        </div>
      </div>
    </div>
  );
}
