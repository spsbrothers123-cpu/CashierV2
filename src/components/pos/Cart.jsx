import { useState } from 'react';
import { Trash2, UserRound, PauseCircle, Wallet, CreditCard, Smartphone, Receipt } from 'lucide-react';
import { CartItem } from './CartItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/utils/cn';
import { ShoppingCart } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Wallet },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'credit', label: 'Credit', icon: Receipt },
];

export function Cart({
  items,
  customer,
  totals,
  onUpdateQuantity,
  onRemove,
  onEditItem,
  onClearCart,
  onOpenCustomer,
  onOpenHold,
  onHoldBill,
  holding,
  onCompletePayment,
}) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const isEmpty = items.length === 0;

  return (
    <div className="flex h-full flex-col bg-surface-white">
      <div className="flex items-center justify-between border-b border-charcoal-900/8 px-4 py-3.5">
        <h2 className="font-display text-base font-semibold text-charcoal-900">Cart</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHold}
            className="rounded-[8px] px-2 py-1 text-xs font-medium text-charcoal-500 hover:bg-charcoal-900/5"
          >
            Held bills
          </button>
          {!isEmpty && (
            <button
              onClick={onClearCart}
              aria-label="Clear cart"
              className="rounded-[8px] p-1.5 text-charcoal-300 hover:bg-danger-500/10 hover:text-danger-600"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onOpenCustomer}
        className="flex items-center gap-2.5 border-b border-charcoal-900/8 px-4 py-3 text-left hover:bg-charcoal-900/3"
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-charcoal-900/6 text-charcoal-600">
          <UserRound className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-charcoal-900">{customer?.name || 'Walk-in customer'}</p>
          {customer?.phone && <p className="truncate text-xs text-charcoal-400">{customer.phone}</p>}
        </div>
        <span className="text-xs font-medium text-egg-600">{customer ? 'Change' : 'Add'}</span>
      </button>

      <div className="flex-1 overflow-y-auto px-4">
        {isEmpty ? (
          <EmptyState
            icon={ShoppingCart}
            title="Cart is empty"
            description="Add products from the catalogue to start a bill."
            className="py-14"
          />
        ) : (
          <div className="divide-y divide-charcoal-900/6">
            {items.map((item) => (
              <CartItem
                key={item.product.id}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemove}
                onEdit={onEditItem}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-charcoal-900/8 px-4 py-3.5">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Subtotal</dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Discount</dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(totals.discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Tax</dt>
            <dd className="font-medium text-charcoal-900">{formatCurrency(totals.tax)}</dd>
          </div>
        </dl>
        <div className="mt-2 flex items-center justify-between border-t border-charcoal-900/8 pt-2.5">
          <span className="font-display text-sm font-semibold text-charcoal-900">Grand Total</span>
          <span className="font-display text-lg font-bold text-charcoal-900">{formatCurrency(totals.grandTotal)}</span>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPaymentMethod(id)}
              disabled={isEmpty}
              className={cn(
                'flex flex-col items-center gap-1 rounded-[10px] border py-2 text-xs font-medium transition-colors disabled:opacity-40',
                paymentMethod === id
                  ? 'border-egg-500 bg-egg-300/20 text-charcoal-900'
                  : 'border-charcoal-900/10 text-charcoal-500 hover:bg-charcoal-900/4'
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <Button
          size="lg"
          className="mt-3 w-full"
          disabled={isEmpty}
          onClick={() => onCompletePayment(paymentMethod)}
        >
          Complete Payment
        </Button>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={isEmpty} loading={holding} onClick={onHoldBill}>
            <PauseCircle className="size-4" /> Hold Bill
          </Button>
          <Button variant="ghost" disabled={isEmpty} onClick={onClearCart}>
            Clear Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
