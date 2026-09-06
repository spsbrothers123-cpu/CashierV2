import { Egg, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/utils/cn';

export function ProductCard({ product, quantityInCart = 0, onSelect }) {
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  return (
    <div
      role="button"
      tabIndex={outOfStock ? -1 : 0}
      onClick={() => !outOfStock && onSelect(product)}
      onKeyDown={(e) => {
        if (!outOfStock && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect(product);
        }
      }}
      className={cn(
        'flex flex-col rounded-card border border-charcoal-900/8 bg-surface-white p-3 shadow-soft transition-shadow',
        outOfStock ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:shadow-lifted'
      )}
    >
      <div className="relative mb-3 flex h-24 items-center justify-center overflow-hidden rounded-[10px] bg-ivory-100">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <Egg className="size-8 text-egg-400/70" aria-hidden />
        )}
        {quantityInCart > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-egg-400 text-[11px] font-bold text-charcoal-900">
            {quantityInCart}
          </span>
        )}
      </div>

      <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-charcoal-900">{product.name}</p>
      {product.sku && <p className="mt-0.5 text-xs text-charcoal-300">{product.sku}</p>}

      <div className="mt-1.5 flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-charcoal-900">
          {formatCurrency(product.price)}
          <span className="ml-1 text-xs font-normal text-charcoal-300">/{product.unit}</span>
        </p>
        <Badge tone={outOfStock ? 'danger' : lowStock ? 'warning' : 'success'}>
          {outOfStock ? 'Out of stock' : lowStock ? `${product.stock} left` : 'In stock'}
        </Badge>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(product);
        }}
        disabled={outOfStock}
        className={cn(
          'mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-[10px] text-sm font-medium transition-colors',
          outOfStock
            ? 'cursor-not-allowed bg-charcoal-900/5 text-charcoal-300'
            : 'bg-egg-400 text-charcoal-900 hover:bg-egg-300 active:bg-egg-500'
        )}
      >
        <Plus className="size-4" aria-hidden />
        {quantityInCart > 0 ? 'Edit' : 'Add'}
      </button>
    </div>
  );
}
