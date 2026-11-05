/**
 * Single source of truth for stock state in the Cashier app.
 *
 * - out : stock <= 0
 * - low : stock <= lowStockThreshold, where the threshold is the per-product
 *         value resolved by the backend (GET /products -> lowStockThreshold)
 * - in  : everything else
 *
 * A missing, null, zero, negative or non-numeric threshold means "no low-stock
 * warning" for that product. There is deliberately NO fallback number: the
 * threshold is owned by the Admin, never guessed in the Cashier app.
 */
export function normalizeThreshold(value) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** @returns {'out' | 'low' | 'in'} */
export function getStockState(product) {
  const stock = Number(product?.stock ?? 0);
  if (!(stock > 0)) return 'out';
  const threshold = normalizeThreshold(product?.lowStockThreshold);
  if (threshold > 0 && stock <= threshold) return 'low';
  return 'in';
}

export const STOCK_TONE = { out: 'danger', low: 'warning', in: 'success' };
