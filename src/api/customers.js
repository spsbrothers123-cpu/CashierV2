import { apiClient, USE_STUB_API } from './client';
import { stubApi } from './stub';

/**
 * BACKEND ENDPOINT REQUIRED (when USE_STUB_API is false):
 *   GET  /customers?query=          -> Customer[]
 *   POST /customers  { name, phone } -> Customer
 *
 * Customers created via createCustomer() (cashier-side "Add Customer") must
 * land in the same table/list the Admin Customer page reads from, so a
 * customer added mid-bill by a cashier is immediately visible to admins too.
 */
export async function searchCustomers(query) {
  if (USE_STUB_API) return stubApi.searchCustomers(query);
  const { data } = await apiClient.get('/customers', { params: { query } });
  return data;
}

export async function createCustomer({ name, phone }) {
  if (USE_STUB_API) return stubApi.createCustomer({ name, phone });
  const { data } = await apiClient.post('/customers', { name, phone });
  return data;
}
