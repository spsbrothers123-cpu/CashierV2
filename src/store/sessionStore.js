import { create } from 'zustand';
import {
  getCurrentSession,
  startSession as apiStartSession,
  closeSession as apiCloseSession,
} from '@/api/session';

export const useSessionStore = create((set, get) => ({
  session: null,
  status: 'idle', // idle | loading | ready | error
  closing: false,
  error: null,

  async loadSession(cashierId) {
    set({ status: 'loading', error: null });
    try {
      const session = await getCurrentSession(cashierId);
      set({ session, status: 'ready' });
    } catch (err) {
      set({ status: 'error', error: err });
    }
  },

  async startSession({ cashierId, shopId, openingCash }) {
    set({ status: 'loading', error: null });
    try {
      const session = await apiStartSession({ cashierId, shopId, openingCash });
      set({ session, status: 'ready' });
      return { ok: true };
    } catch (err) {
      set({ status: 'ready', error: err });
      return { ok: false, error: err };
    }
  },

  /** Refetches the current session's server-computed totals (e.g. after a
   * bill is completed) without disturbing loading/error UI state. */
  async refreshSummary(cashierId) {
    try {
      const session = await getCurrentSession(cashierId);
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
    set({ closing: true });
    try {
      const closed = await apiCloseSession({ cashierId, sessionId: session.id, actualClosingCash });
      set({ session: closed, closing: false });
      return { ok: true, session: closed };
    } catch (err) {
      set({ closing: false });
      return { ok: false, error: err };
    }
  },

  clear() {
    set({ session: null, status: 'idle', closing: false, error: null });
  },
}));
