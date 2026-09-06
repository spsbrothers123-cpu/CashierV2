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
  return data;
}

export async function getCategories() {
  if (USE_STUB_API) return stubApi.getCategories();
  const { data } = await apiClient.get('/products/categories');
  return data;
}
