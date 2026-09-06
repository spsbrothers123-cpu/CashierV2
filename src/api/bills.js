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
export async function getHeldBills(shopId) {
  if (USE_STUB_API) return stubApi.getHeldBills(shopId);
  const { data } = await apiClient.get('/bills/held', { params: { shopId } });
  return data;
}

export async function holdBill(bill) {
  if (USE_STUB_API) return stubApi.holdBill(bill);
  const { data } = await apiClient.post('/bills/hold', bill);
  return data;
}

export async function deleteHeldBill(id) {
  if (USE_STUB_API) return stubApi.deleteHeldBill(id);
  const { data } = await apiClient.delete(`/bills/held/${id}`);
  return data;
}

export async function checkoutBill(payload) {
  if (USE_STUB_API) return stubApi.checkoutBill(payload);
  const { data } = await apiClient.post('/bills/checkout', payload);
  return data;
}

export async function getBillHistory(params) {
  if (USE_STUB_API) return stubApi.getBillHistory(params);
  const { data } = await apiClient.get('/bills/history', { params });
  return data;
}

export async function getBillById(id) {
  if (USE_STUB_API) return stubApi.getBillById(id);
  const { data } = await apiClient.get(`/bills/${id}`);
  return data;
}
