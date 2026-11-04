import { apiClient, USE_STUB_API } from './client';
import { stubApi } from './stub';

/**
 * BACKEND ENDPOINT REQUIRED (when USE_STUB_API is false):
 *   GET    /bills/held           -> HeldBill[]
 *   POST   /bills/hold           { customer, items, amount } -> HeldBill
 *   DELETE /bills/held/:id
 *   POST   /bills/checkout       { ...cart, payments, idempotencyKey } -> Bill
 *   GET    /bills/history        { shopId, cashierId, query, dateFrom,
 *                                   dateTo, paymentMethod, customerId } -> Bill[]
 *   GET    /bills/:id            -> Bill
 *
 * The backend is the final authority on whether a checkout succeeds —
 * see payments.js callers for the "never trust frontend totals" note.
 */
/**
 * Phase 2 Stage 2.5/2.8: the client NEVER supplies a selling price. Only
 * product ids and quantities cross the wire; the backend resolves the
 * effective branch price (branch override, else common price) itself.
 */
function toPricelessItems(items = []) {
  return items.map((i) => ({ product: { id: i.product.id }, quantity: i.quantity }));
}

export async function getHeldBills(shopId) {
  if (USE_STUB_API) return stubApi.getHeldBills(shopId);
  const { data } = await apiClient.get('/bills/held', { params: { shopId } });
  return data;
}

export async function holdBill(bill) {
  if (USE_STUB_API) return stubApi.holdBill(bill);
  const { data } = await apiClient.post('/bills/hold', {
    label: bill.label,
    customer: bill.customer ? { id: bill.customer.id } : null,
    items: toPricelessItems(bill.items),
  });
  return data;
}

export async function deleteHeldBill(id) {
  if (USE_STUB_API) return stubApi.deleteHeldBill(id);
  const { data } = await apiClient.delete(`/bills/held/${id}`);
  return data;
}

export async function checkoutBill(payload) {
  if (USE_STUB_API) return stubApi.checkoutBill(payload);
  const { data } = await apiClient.post('/bills/checkout', {
    customer: payload.customer ? { id: payload.customer.id } : null,
    items: toPricelessItems(payload.items),
    payments: payload.payments,
    idempotencyKey: payload.idempotencyKey,
  });
  return data;
}

export async function getBillHistory(params) {
  if (USE_STUB_API) return stubApi.getBillHistory(params);
  // includeCancelled: cancelled bills stay visible (clearly labelled).
  const { data } = await apiClient.get('/bills/history', { params: { ...params, includeCancelled: 'true' } });
  return data;
}

export async function getBillById(id) {
  if (USE_STUB_API) return stubApi.getBillById(id);
  const { data } = await apiClient.get(`/bills/${id}`);
  return data;
}
