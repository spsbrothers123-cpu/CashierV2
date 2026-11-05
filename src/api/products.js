import { apiClient, USE_STUB_API } from './client';
import { stubApi } from './stub';

/**
 * BACKEND ENDPOINT REQUIRED (when USE_STUB_API is false):
 *   GET /products?query=&category=&barcode=   -> Product[]
 *   GET /products/categories                  -> string[]
 */
export async function searchProducts(params) {
  if (USE_STUB_API) return stubApi.searchProducts(params);
  const { data } = await apiClient.get('/products', { params });
  // The backend is authoritative for visibility, stock and price; the client
  // only guards the shape so a malformed body can never reach the UI.
  if (!Array.isArray(data)) {
    throw { kind: 'unknown', message: 'Unexpected response from the server. Please try again.' };
  }
  return data;
}

export async function getCategories() {
  if (USE_STUB_API) return stubApi.getCategories();
  const { data } = await apiClient.get('/products/categories');
  if (!Array.isArray(data)) {
    throw { kind: 'unknown', message: 'Unexpected response from the server. Please try again.' };
  }
  return data;
}
