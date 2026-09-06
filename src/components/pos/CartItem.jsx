import { Minus, Plus, X, Egg } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';

export function CartItem({ item, onUpdateQuantity, onRemove, onEdit }) {
  const { product, quantity } = item;
  const unitPrice = item.unitPrice ?? product.price;
  const lineTotal = unitPrice * quantity;
  const priceOverridden = unitPrice !== product.price;

  return (
    <div className="flex items-center gap-3 py-3">
      <button
        onClick={() => onEdit?.(item)}
        aria-label={`Edit ${product.name}`}
        className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-ivory-100"
      >
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="size-full rounded-[10px] object-cover" />
        ) : (
          <Egg className="size-5 text-egg-400/70" aria-hidden />
        )}
      </button>

      <button onClick={() => onEdit?.(item)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-charcoal-900">{product.name}</p>
        <p className="text-xs text-charcoal-300">
          {formatCurrency(unitPrice)} / {product.unit}
          {priceOverridden && <span className="ml-1.5 text-egg-600">(edited)</span>}
        </p>
      </button>

      <div className="flex items-center gap-1.5 rounded-full border border-charcoal-900/10 px-1 py-1">
        <button
          onClick={() => onUpdateQuantity(product.id, quantity - 1)}
          aria-label="Decrease quantity"
          className="flex size-6 items-center justify-center rounded-full text-charcoal-600 hover:bg-charcoal-900/6"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="w-5 text-center text-sm font-medium tabular-nums">{quantity}</span>
        <button
          onClick={() => onUpdateQuantity(product.id, quantity + 1)}
          aria-label="Increase quantity"
          className="flex size-6 items-center justify-center rounded-full text-charcoal-600 hover:bg-charcoal-900/6"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <p className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-charcoal-900">
        {formatCurrency(lineTotal)}
      </p>

      <button
        onClick={() => onRemove(product.id)}
        aria-label={`Remove ${product.name}`}
        className="shrink-0 rounded-full p-1 text-charcoal-300 hover:bg-danger-500/10 hover:text-danger-600"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
