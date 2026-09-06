import { cn } from '@/utils/cn';

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-md bg-charcoal-900/8', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-card border border-charcoal-900/8 bg-surface-white p-3">
      <Skeleton className="mb-3 h-24 w-full rounded-[10px]" />
      <Skeleton className="mb-2 h-4 w-3/4" />
      <Skeleton className="mb-3 h-3 w-1/2" />
      <Skeleton className="h-9 w-full rounded-[10px]" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="size-12 rounded-[10px]" />
      <div className="flex-1">
        <Skeleton className="mb-2 h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-4 w-12" />
    </div>
  );
}
