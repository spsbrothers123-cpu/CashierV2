/**
 * Backend rejections that mean "the cart you sent no longer matches the live
 * branch catalogue" (stock or price moved after the line was added). On any
 * of these the Cashier's cart is refreshed against the live catalogue; the
 * backend stays the only authority on whether a sale succeeds.
 */
export const CHECKOUT_RECONCILE_CODES = new Set([
  'OUT_OF_STOCK',
  'INSUFFICIENT_STOCK',
  'PRODUCT_NOT_FOUND',
  'PRODUCT_INACTIVE',
  'PAYMENT_AMOUNT_MISMATCH',
]);

const money = (n) => `₹${Number(n)}`;

/** One short, human-readable sentence fragment per change (see cartStore.reconcileWithCatalogue). */
export function describeCartChanges(changes) {
  return changes
    .map((c) => {
      if (c.type === 'removed') return `${c.name} removed (no longer available)`;
      if (c.type === 'reduced') return `${c.name} reduced to ${c.to} ${c.unit || 'unit'}(s) (only ${c.to} in stock)`;
      if (c.type === 'repriced') return `${c.name} price changed ${money(c.from)} → ${money(c.to)}`;
      return c.name;
    })
    .join('; ');
}
