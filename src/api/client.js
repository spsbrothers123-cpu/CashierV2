import axios from 'axios';

/**
 * Single shared API client. All requests to the real Egg Mart backend
 * must go through this instance — do not scatter axios/fetch calls
 * throughout components.
 *
 * BACKEND ENDPOINT REQUIRED: base URL below assumes a REST backend at
 * VITE_API_BASE_URL. Controlled by VITE_USE_STUB_API (see .env) — when
 * "true", src/api/stub/index.js intercepts every call instead of hitting
 * the network. Now wired to the real backend by default.
 */
export const USE_STUB_API = (import.meta.env.VITE_USE_STUB_API ?? 'false') === 'true';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const TOKEN_KEY = 'eggmart_cashier_token';

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized = null;
export function registerUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Backend remains the final authority on authorization — a 401/403
    // here always wins over any locally cached auth state.
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      if (onUnauthorized) onUnauthorized(error.response.status);
    }
    return Promise.reject(normalizeError(error));
  }
);

export function normalizeError(error) {
  if (!error.response) {
    return { kind: 'network', message: 'Network error. Check your connection and try again.' };
  }

  const status = error.response.status;
  const data = error.response.data;
  const serverMessage = data?.message;

  // Keep the original response around so call sites that need finer-grained
  // info (e.g. a specific error `code` from the backend) aren't stuck with
  // only { kind, message }. Most call sites can ignore this entirely.
  const base = { raw: error.response };

  if (status === 401) {
    return { ...base, kind: 'unauthorized', code: data?.code, message: serverMessage || 'Invalid credentials.' };
  }
  if (status === 403) {
    return { ...base, kind: 'forbidden', code: data?.code, message: serverMessage || 'This account is not authorized.' };
  }
  if (status === 404) {
    return { ...base, kind: 'not_found', code: data?.code, message: serverMessage || 'Not found.' };
  }
  if (status >= 500) {
    return { ...base, kind: 'server', code: data?.code, message: serverMessage || 'Server error. Please try again.' };
  }
  return { ...base, kind: 'unknown', code: data?.code, message: serverMessage || 'Something went wrong.' };
}
