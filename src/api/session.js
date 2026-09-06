import { apiClient, USE_STUB_API } from './client';
import { stubApi } from './stub';

/**
 * BACKEND ENDPOINT REQUIRED (when USE_STUB_API is false):
 *   GET  /sessions/current                          -> Session | null
 *   POST /sessions/start   { shopId, openingCash }   -> Session
 *   POST /sessions/close   { sessionId, actualClosingCash } -> Session
 *
 * Session sales totals (cashSales, expectedCash, etc.) are always
 * server-computed — the frontend only ever displays them, never derives
 * its own figures from locally cached bills.
 */
export async function getCurrentSession(cashierId) {
  if (USE_STUB_API) return stubApi.getCurrentSession(cashierId);
  try {
    const { data } = await apiClient.get('/sessions/current');
    return data;
  } catch (err) {
    // NOTE: apiClient's response interceptor normalizes errors to
    // { kind, code, message, raw }, not the raw axios error — so check
    // err.kind / err.code here, not err.response.
    if (err.kind === 'not_found' && err.code === 'NO_ACTIVE_SESSION') {
      return null;
    }
    throw err;
  }
}

export async function startSession({ cashierId, shopId, openingCash }) {
  if (USE_STUB_API) return stubApi.startSession({ cashierId, shopId, openingCash });
  const { data } = await apiClient.post('/sessions/start', { shopId, openingCash });
  return data;
}

export async function closeSession({ cashierId, sessionId, actualClosingCash }) {
  if (USE_STUB_API) return stubApi.closeSession({ cashierId, sessionId, actualClosingCash });
  const { data } = await apiClient.post('/sessions/close', { sessionId, actualClosingCash });
  return data;
}
