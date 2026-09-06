import { create } from 'zustand';
import { login as apiLogin, fetchCurrentCashier, logout as apiLogout } from '@/api/auth';
import { getToken, setToken, registerUnauthorizedHandler } from '@/api/client';
import { useCartStore } from '@/store/cartStore';

export const useAuthStore = create((set) => ({
  cashier: null,
  status: 'idle', // idle | loading | authenticated | unauthenticated
  error: null,

  /** Called once at app boot to restore session from stored token.
   * Backend /auth/me remains the authority — a stored token is only
   * ever a hint to try, never treated as proof of authorization. */
  async hydrate() {
    const token = getToken();
    if (!token) {
      set({ status: 'unauthenticated' });
      return;
    }
    set({ status: 'loading' });
    try {
      const cashier = await fetchCurrentCashier();
      set({ cashier, status: 'authenticated', error: null });
    } catch {
      setToken(null);
      set({ cashier: null, status: 'unauthenticated' });
    }
  },

  async login(email, password) {
    set({ status: 'loading', error: null });
    try {
      const { token, cashier } = await apiLogin({ email, password });
      setToken(token);
      set({ cashier, status: 'authenticated', error: null });
      return { ok: true };
    } catch (err) {
      set({ status: 'unauthenticated', error: err });
      return { ok: false, error: err };
    }
  },

  async logout() {
    try {
      await apiLogout();
    } finally {
      // Clear sensitive cached data on the way out. Logout intentionally
      // does NOT touch the cashier session (see sessionStore) — closing an
      // active shift is a separate, explicit action per the project spec.
      setToken(null);
      useCartStore.getState().clearCart();
      set({ cashier: null, status: 'unauthenticated', error: null });
    }
  },
}));

// If any API call comes back 401/403, forcibly log out locally —
// backend authorization always wins over cached client state.
registerUnauthorizedHandler(() => {
  setToken(null);
  useAuthStore.setState({ cashier: null, status: 'unauthenticated' });
});
