import { create } from 'zustand';
import { login as apiLogin, fetchCurrentCashier, logout as apiLogout } from '@/api/auth';
import { getToken, setToken, registerUnauthorizedHandler } from '@/api/client';
import { useCartStore } from '@/store/cartStore';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Everything held in memory on behalf of ONE signed-in cashier. It must never
 * outlive that cashier's authentication: a different cashier signing in on the
 * same device/tab must start from a clean slate. (This clears the client's
 * cached copy only — it never closes or alters the cashier's session on the
 * backend; closing a shift stays an explicit action.)
 */
function resetPerCashierState() {
  useCartStore.getState().clearCart();
  useSessionStore.getState().clear();
}

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
      // does NOT close the cashier's session on the backend — closing an
      // active shift is a separate, explicit action per the project spec —
      // but the cached copy must not survive for the next person to sign in.
      setToken(null);
      resetPerCashierState();
      set({ cashier: null, status: 'unauthenticated', error: null });
    }
  },
}));

// If the backend says the authentication itself is no longer valid (see
// isAuthInvalidation in api/client.js — NOT every 403), drop local auth state
// and everything cached for that cashier. Backend invalidation always wins.
registerUnauthorizedHandler(() => {
  setToken(null);
  resetPerCashierState();
  useAuthStore.setState({ cashier: null, status: 'unauthenticated' });
});

// Safety net for every path (login, hydrate, logout, invalidation): whenever
// the signed-in cashier changes, nothing cached for the previous one remains.
useAuthStore.subscribe((state, prev) => {
  if ((state.cashier?.id ?? null) !== (prev.cashier?.id ?? null)) resetPerCashierState();
});
