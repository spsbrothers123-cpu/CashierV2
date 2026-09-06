import { useEffect, useState } from 'react';
import { Minus, Plus, Egg } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/currency';
import { supportsDecimalQuantity, quantityStep, MAX_QUANTITY } from '@/utils/quantity';
import { cn } from '@/utils/cn';

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Product selection → quantity/price edit → add-to-cart modal.
 *
 * `product` is the catalog product being selected. `existingItem` (if the
 * product is already in the cart) pre-fills quantity/price so re-selecting
 * a cart line edits it in place instead of creating a duplicate.
 *
 * Price edits here are a bill-level override only — the modal never touches
 * `product.price` (the master/catalog price); it only reports back the
 * chosen `unitPrice` for this cart line via `onConfirm`.
 */
export function ProductEditModal({ open, product, existingItem, onConfirm, onCancel }) {
  const allowDecimal = supportsDecimalQuantity(product);
  const step = quantityStep(product);

  const initialQuantity = existingItem?.quantity ?? 1;
  const initialPrice = existingItem?.unitPrice ?? product?.price ?? 0;

  const [quantityStr, setQuantityStr] = useState(String(initialQuantity));
  const [priceStr, setPriceStr] = useState(String(initialPrice));
  const [touched, setTouched] = useState({ quantity: false, price: false });
  const [shake, setShake] = useState(false);

  // Re-seed whenever a new product/edit target opens.
  useEffect(() => {
    if (open) {
      setQuantityStr(String(existingItem?.quantity ?? 1));
      setPriceStr(String(existingItem?.unitPrice ?? product?.price ?? 0));
      setTouched({ quantity: false, price: false });
      setShake(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  if (!open || !product) return null;

  const quantityNum = Number(quantityStr);
  const priceNum = Number(priceStr);

  const quantityError = (() => {
    if (quantityStr.trim() === '') return 'Enter a quantity.';
    if (Number.isNaN(quantityNum)) return 'Quantity must be a number.';
    if (quantityNum <= 0) return 'Quantity must be greater than zero.';
    if (quantityNum > MAX_QUANTITY) return `Quantity seems too large (max ${MAX_QUANTITY}).`;
    if (!allowDecimal && !Number.isInteger(quantityNum)) {
      return `${product.unit || 'This item'} can't be sold in fractional quantities.`;
    }
    return null;
  })();

  const priceError = (() => {
    if (priceStr.trim() === '') return 'Enter a price.';
    if (Number.isNaN(priceNum)) return 'Price must be a number.';
    if (priceNum < 0) return 'Price cannot be negative.';
    return null;
  })();

  const isValid = !quantityError && !priceError;
  const total = isValid ? roundTo(quantityNum * priceNum, 2) : null;

  const isDirty = quantityStr !== String(initialQuantity) || priceStr !== String(initialPrice);
  const priceOverridden = isValid && roundTo(priceNum, 2) !== roundTo(product.price, 2);

  function requestClose() {
    setTouched({ quantity: false, price: false });
    onCancel();
  }

  function handleBackdropClick() {
    // Guard against accidentally discarding an in-progress edit from a stray
    // outside click — Cancel / Esc / Add to Cart remain the explicit ways out.
    if (!isDirty) {
      requestClose();
      return;
    }
    setShake(true);
    setTimeout(() => setShake(false), 300);
  }

  function nudgeQuantity(delta) {
    const base = Number.isNaN(quantityNum) ? 0 : quantityNum;
    const next = roundTo(Math.max(step, base + delta), allowDecimal ? 2 : 0);
    setQuantityStr(String(next));
  }

  function handleConfirm() {
    setTouched({ quantity: true, price: true });
    if (!isValid) return;
    onConfirm({ quantity: quantityNum, unitPrice: roundTo(priceNum, 2) });
  }

  return (
    <Modal
      open={open}
      onClose={requestClose}
      onBackdropClick={handleBackdropClick}
      title={existingItem ? 'Edit Cart Item' : 'Add Item'}
      className={cn('max-w-sm transition-transform', shake && 'animate-[shake_0.3s_ease-in-out]')}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            {existingItem ? 'Update Cart' : 'Add to Cart'}
          </Button>
        </div>
      }
    >
      <style>{`@keyframes shake { 10%,90% { transform: translateX(-1px); } 20%,80% { transform: translateX(2px); } 30%,50%,70% { transform: translateX(-4px); } 40%,60% { transform: translateX(4px); } }`}</style>

      {/* Product summary */}
      <div className="flex items-center gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-ivory-100">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <Egg className="size-6 text-egg-400/70" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-charcoal-900">{product.name}</p>
          <p className="mt-0.5 text-xs text-charcoal-400">
            {product.sku ? `${product.sku} · ` : ''}
            Master price: {formatCurrency(product.price)} / {product.unit}
          </p>
        </div>
      </div>

      {/* Quantity */}
      <div className="mt-4">
        <label htmlFor="edit-qty" className="mb-1.5 block text-sm font-medium text-charcoal-800">
          Quantity {product.unit ? `(${product.unit})` : ''}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => nudgeQuantity(-step)}
            aria-label="Decrease quantity"
            className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-charcoal-900/12 text-charcoal-600 hover:bg-charcoal-900/5"
          >
            <Minus className="size-4" />
          </button>
          <input
            id="edit-qty"
            type="text"
            inputMode="decimal"
            value={quantityStr}
            onChange={(e) => setQuantityStr(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, quantity: true }))}
            className={cn(
              'h-11 w-full rounded-[10px] border bg-surface-white px-3 text-center text-base font-semibold tabular-nums outline-none',
              quantityError && touched.quantity
                ? 'border-danger-500 focus:border-danger-500'
                : 'border-charcoal-900/12 focus:border-egg-500'
            )}
          />
          <button
            type="button"
            onClick={() => nudgeQuantity(step)}
            aria-label="Increase quantity"
            className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-charcoal-900/12 text-charcoal-600 hover:bg-charcoal-900/5"
          >
            <Plus className="size-4" />
          </button>
        </div>
        {quantityError && touched.quantity && <p className="mt-1.5 text-sm text-danger-600">{quantityError}</p>}
      </div>

      {/* Price */}
      <div className="mt-3.5">
        <label htmlFor="edit-price" className="mb-1.5 block text-sm font-medium text-charcoal-800">
          Selling Price (this bill)
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-charcoal-300">
            ₹
          </span>
          <input
            id="edit-price"
            type="text"
            inputMode="decimal"
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, price: true }))}
            className={cn(
              'h-11 w-full rounded-[10px] border bg-surface-white pl-7 pr-3 text-sm outline-none',
              priceError && touched.price
                ? 'border-danger-500 focus:border-danger-500'
                : 'border-charcoal-900/12 focus:border-egg-500'
            )}
          />
        </div>
        {priceError && touched.price ? (
          <p className="mt-1.5 text-sm text-danger-600">{priceError}</p>
        ) : (
          priceOverridden && (
            <p className="mt-1.5 text-xs text-egg-600">
              Overridden for this bill only — catalog price stays {formatCurrency(product.price)}.
            </p>
          )
        )}
      </div>

      {/* Total */}
      <div className="mt-4 flex items-center justify-between rounded-[10px] bg-charcoal-900/4 px-4 py-3.5">
        <span className="text-sm font-medium text-charcoal-500">Item Total</span>
        <span className="font-display text-2xl font-bold text-charcoal-900">
          {total !== null ? formatCurrency(total) : '—'}
        </span>
      </div>
    </Modal>
  );
}
