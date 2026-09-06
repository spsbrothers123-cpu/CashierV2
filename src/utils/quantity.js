// Units that are naturally sold by weight/volume and therefore support
// fractional (decimal) quantities. Whole-count units (tray, pack, pc, ...)
// do not, unless the product explicitly opts in via `allowDecimalQuantity`.
const DECIMAL_UNITS = new Set(['kg', 'g', 'gram', 'grams', 'l', 'ltr', 'litre', 'liter', 'ml']);

/**
 * Whether a given product's quantity may be entered as a decimal.
 * Respects an explicit `product.allowDecimalQuantity` flag when present,
 * otherwise falls back to a heuristic based on the product's unit.
 */
export function supportsDecimalQuantity(product) {
  if (!product) return false;
  if (typeof product.allowDecimalQuantity === 'boolean') return product.allowDecimalQuantity;
  const unit = String(product.unit || '').trim().toLowerCase();
  return DECIMAL_UNITS.has(unit);
}

/** Sensible increment for the +/- steppers, given decimal support. */
export function quantityStep(product) {
  return supportsDecimalQuantity(product) ? 0.1 : 1;
}

/** Upper bound used to catch fat-fingered / unrealistic quantities. */
export const MAX_QUANTITY = 10000;
