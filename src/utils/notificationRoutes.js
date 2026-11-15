// Maps backend `target.kind` metadata to routes the Cashier app already owns.
// The backend never supplies a URL (no open-redirect surface). Unknown or
// unsupported kinds return null → no "Open" action is shown.
const ROUTES = {
  product: '/cashier/inventory',
  session: '/cashier/sessions',
  account: '/cashier/profile',
  bill: '/cashier/history',
};

export function routeForTarget(target) {
  if (!target || typeof target.kind !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(ROUTES, target.kind) ? ROUTES[target.kind] : null;
}

/** Defence-in-depth only; the backend is the authorization authority. */
export function isForCashier(n, cashier) {
  if (!n || !cashier) return false;
  if (n.recipientCashierId && n.recipientCashierId !== cashier.id) return false;
  const shopId = cashier.shop?.id ?? cashier.shopId;
  if (n.shopId && shopId && n.shopId !== shopId) return false;
  return true;
}

export function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `ack_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
