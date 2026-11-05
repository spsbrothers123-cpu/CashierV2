import { create } from 'zustand';
import {
  getCurrentSession,
  startSession as apiStartSession,
  closeSession as apiCloseSession,
} from '@/api/session';

/**
 * A session object is only ever shown/used for the cashier it belongs to.
 * Older/legacy payloads without a cashierId are treated as the caller's own.
 */
export function sessionBelongsTo(session, cashierId) {
  if (!session) return false;
  return !session.cashierId || !cashierId || session.cashierId === cashierId;
}

export const useSessionStore = create((set, get) => ({
  session: null,
  // Bumped by clear(). Every async action captures it first and drops its
  // result if it changed, so a response for cashier A that lands after
  // cashier B signed in can never be written into the store.
  epoch: 0,
  status: 'idle', // idle | loading | ready | error
  closing: false,
  error: null,

  async loadSession(cashierId) {
    const epoch = get().epoch;
    set({ status: 'loading', error: null });
    try {
      const session = await getCurrentSession(cashierId);
      if (get().epoch !== epoch) return;
      set({ session, status: 'ready' });
    } catch (err) {
      if (get().epoch !== epoch) return;
      set({ status: 'error', error: err });
    }
  },

  async startSession({ cashierId, shopId, openingCash }) {
    const epoch = get().epoch;
    set({ status: 'loading', error: null });
    try {
      const session = await apiStartSession({ cashierId, shopId, openingCash });
      if (get().epoch !== epoch) return { ok: false, stale: true };
      set({ session, status: 'ready' });
      return { ok: true };
    } catch (err) {
      if (get().epoch !== epoch) return { ok: false, stale: true };
      set({ status: 'ready', error: err });
      return { ok: false, error: err };
    }
  },

  /** Refetches the current session's server-computed totals (e.g. after a
   * bill is completed) without disturbing loading/error UI state. */
  async refreshSummary(cashierId) {
    const epoch = get().epoch;
    try {
      const session = await getCurrentSession(cashierId);
      if (get().epoch !== epoch) return;
      set({ session });
    } catch {
      // Non-fatal — the visible totals just won't update until next refresh.
    }
  },

  async closeSession({ cashierId, actualClosingCash }) {
    const { session } = get();
    if (get().closing) return { ok: false };
    if (!session || session.status !== 'active') {
      return { ok: false, error: { message: 'No active session to close.' } };
    }
    const epoch = get().epoch;
    set({ closing: true });
    try {
      const closed = await apiCloseSession({ cashierId, sessionId: session.id, actualClosingCash });
      if (get().epoch !== epoch) return { ok: false, stale: true };
      set({ session: closed, closing: false });
      return { ok: true, session: closed };
    } catch (err) {
      if (get().epoch !== epoch) return { ok: false, stale: true };
      set({ closing: false });
      return { ok: false, error: err };
    }
  },

  clear() {
    set((state) => ({ session: null, status: 'idle', closing: false, error: null, epoch: state.epoch + 1 }));
  },
}));
