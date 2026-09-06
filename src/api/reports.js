import { apiClient, USE_STUB_API } from './client';
import { stubApi } from './stub';

/**
 * BACKEND ENDPOINT REQUIRED (when USE_STUB_API is false):
 *   GET /reports/sales   { shopId, cashierId, from, to } -> SalesReport
 *
 * Split payments must be represented correctly server-side: a bill split
 * across methods counts once in `sales` and its per-method amount in the
 * matching cashSales/cardSales/upiSales/creditSales bucket — never twice.
 */
export async function getSalesReport(params) {
  if (USE_STUB_API) return stubApi.getSalesReport(params);
  const { data } = await apiClient.get('/reports/sales', { params });
  return data;
}
