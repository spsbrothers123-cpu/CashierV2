import { Egg, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/utils/cn';

export function ProductListItem({ product, quantityInCart = 0, onSelect }) {
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
        'flex items-center gap-3 rounded-[10px] border border-charcoal-900/8 bg-surface-white p-2.5 shadow-soft',
        outOfStock ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
      )}
    >
      <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-ivory-100">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <Egg className="size-5 text-egg-400/70" aria-hidden />
        )}
        {quantityInCart > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-egg-400 text-[10px] font-bold text-charcoal-900">
            {quantityInCart}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal-900">{product.name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="text-xs font-semibold text-charcoal-700">
            {formatCurrency(product.price)}
            <span className="ml-1 font-normal text-charcoal-300">/{product.unit}</span>
          </p>
          <Badge tone={outOfStock ? 'danger' : lowStock ? 'warning' : 'success'}>
            {outOfStock ? 'Out of stock' : lowStock ? `${product.stock} left` : 'In stock'}
          </Badge>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(product);
        }}
        disabled={outOfStock}
        aria-label={quantityInCart > 0 ? `Edit ${product.name}` : `Add ${product.name}`}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-[10px] transition-colors',
          outOfStock
            ? 'cursor-not-allowed bg-charcoal-900/5 text-charcoal-300'
            : 'bg-egg-400 text-charcoal-900 hover:bg-egg-300 active:bg-egg-500'
        )}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
