import { create } from 'zustand';
import {
  listNotifications,
  getNotification,
  setReadState,
  deleteNotification,
  acknowledgeAnnouncement,
  getNotificationSettings,
  updateNotificationSettings,
} from '@/api/notifications';
import { isForCashier, newIdempotencyKey } from '@/utils/notificationRoutes';

export const RECENT_LIMIT = 8;
export const PAGE_LIMIT = 20;

const EMPTY_FILTERS = { status: 'all', category: '', from: '', to: '' };

function initial() {
  return {
    ownerId: null,
    unreadCount: null,
    recent: { items: [], status: 'idle', error: null },
    page: { items: [], nextCursor: null, status: 'idle', error: null, loadingMore: false, filters: { ...EMPTY_FILTERS } },
    pending: {}, // id -> 'read' | 'delete' | 'ack'
    actionErrors: {}, // id -> message (never shown as success)
    ackKeys: {}, // id -> Idempotency-Key reused until the acknowledge succeeds
    settings: { status: 'idle', categories: [], pending: {}, error: null },
  };
}

const isUnavailable = (err) => err?.kind === 'not_found' || err?.raw?.status === 501;
const dayStart = (d) => (d ? new Date(`${d}T00:00:00`).toISOString() : undefined);
const dayEnd = (d) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : undefined);

function replaceIn(list, n) {
  return list.map((x) => (x.id === n.id ? n : x));
}

export const useNotificationStore = create((set, get) => ({
  ...initial(),
  // Bumped by clear(). Every async action captures it and drops its result if
  // it changed, so a response for cashier A can never land after B signs in.
  epoch: 0,
  recentSeq: 0,
  pageSeq: 0,

  /** Drop everything held for the previous cashier (logout / account change). */
  clear() {
    set((s) => ({ ...initial(), epoch: s.epoch + 1, recentSeq: 0, pageSeq: 0 }));
  },

  /** Bind the store to a cashier; wipes first if a different one was loaded. */
  bind(cashier) {
    const id = cashier?.id ?? null;
    if (get().ownerId !== id) {
      get().clear();
      set({ ownerId: id });
    }
    return id;
  },

  async loadRecent(cashier) {
    if (!get().bind(cashier)) return;
    const { epoch } = get();
    const seq = get().recentSeq + 1;
    set((s) => ({ recentSeq: seq, recent: { ...s.recent, status: 'loading', error: null } }));
    try {
      const res = await listNotifications({ limit: RECENT_LIMIT });
      if (get().epoch !== epoch || get().recentSeq !== seq) return;
      const items = (res.items || []).filter((n) => isForCashier(n, cashier));
      set({
        recent: { items, status: 'ready', error: null },
        unreadCount: typeof res.unreadCount === 'number' ? res.unreadCount : get().unreadCount,
      });
    } catch (err) {
      if (get().epoch !== epoch || get().recentSeq !== seq) return;
      set((s) => ({ recent: { ...s.recent, status: 'error', error: err } }));
    }
  },

  setFilters(patch) {
    set((s) => ({ page: { ...s.page, filters: { ...s.page.filters, ...patch } } }));
  },

  async loadPage(cashier, { append = false } = {}) {
    if (!get().bind(cashier)) return;
    const { epoch } = get();
    const { filters, nextCursor, items: existing } = get().page;
    if (append && !nextCursor) return;
    const seq = get().pageSeq + 1;
    set((s) => ({
      pageSeq: seq,
      page: append
        ? { ...s.page, loadingMore: true, error: null }
        : { ...s.page, status: 'loading', error: null, loadingMore: false, items: [], nextCursor: null },
    }));
    try {
      const res = await listNotifications({
        limit: PAGE_LIMIT,
        cursor: append ? nextCursor : undefined,
        status: filters.status,
        category: filters.category,
        from: dayStart(filters.from),
        to: dayEnd(filters.to),
      });
      if (get().epoch !== epoch || get().pageSeq !== seq) return;
      const incoming = (res.items || []).filter((n) => isForCashier(n, cashier));
      const seen = new Set((append ? existing : []).map((n) => n.id));
      const items = append ? [...existing, ...incoming.filter((n) => !seen.has(n.id))] : incoming;
      set((s) => ({
        page: { ...s.page, items, nextCursor: res.nextCursor || null, status: 'ready', error: null, loadingMore: false },
        unreadCount: typeof res.unreadCount === 'number' ? res.unreadCount : s.unreadCount,
      }));
    } catch (err) {
      if (get().epoch !== epoch || get().pageSeq !== seq) return;
      set((s) => ({ page: { ...s.page, status: append ? s.page.status : 'error', error: err, loadingMore: false } }));
    }
  },

  /** Fetch one notification (deep link from the dropdown). Never marks it read. */
  async fetchOne(cashier, id) {
    if (!get().bind(cashier)) return null;
    const { epoch } = get();
    try {
      const n = await getNotification(id);
      if (get().epoch !== epoch || !isForCashier(n, cashier)) return null;
      return n;
    } catch {
      return null;
    }
  },

  _begin(id, kind) {
    set((s) => ({ pending: { ...s.pending, [id]: kind }, actionErrors: { ...s.actionErrors, [id]: null } }));
  },
  _end(id, error) {
    set((s) => {
      const pending = { ...s.pending };
      delete pending[id];
      return { pending, actionErrors: { ...s.actionErrors, [id]: error ? error.message || 'Something went wrong.' : null } };
    });
  },
  _apply(n, unreadCount) {
    set((s) => ({
      recent: { ...s.recent, items: replaceIn(s.recent.items, n) },
      page: { ...s.page, items: replaceIn(s.page.items, n) },
      unreadCount: typeof unreadCount === 'number' ? unreadCount : s.unreadCount,
    }));
  },

  /** Manual read/unread only. Opening a notification never calls this. */
  async setRead(cashier, id, read) {
    if (get().pending[id]) return { ok: false, busy: true };
    const { epoch } = get();
    get()._begin(id, 'read');
    try {
      const res = await setReadState(id, read);
      if (get().epoch !== epoch) return { ok: false, stale: true };
      if (res?.notification && isForCashier(res.notification, cashier)) get()._apply(res.notification, res.unreadCount);
      get()._end(id, null);
      return { ok: true };
    } catch (err) {
      if (get().epoch !== epoch) return { ok: false, stale: true };
      get()._end(id, err);
      return { ok: false, error: err };
    }
  },

  async remove(cashier, id) {
    if (get().pending[id]) return { ok: false, busy: true };
    const { epoch } = get();
    get()._begin(id, 'delete');
    const drop = (unreadCount) =>
      set((s) => ({
        recent: { ...s.recent, items: s.recent.items.filter((n) => n.id !== id) },
        page: { ...s.page, items: s.page.items.filter((n) => n.id !== id) },
        unreadCount: typeof unreadCount === 'number' ? unreadCount : s.unreadCount,
      }));
    try {
      const res = await deleteNotification(id);
      if (get().epoch !== epoch) return { ok: false, stale: true };
      drop(res?.unreadCount);
      get()._end(id, null);
      return { ok: true };
    } catch (err) {
      if (get().epoch !== epoch) return { ok: false, stale: true };
      if (err?.kind === 'not_found') {
        drop(); // already gone server-side
        get()._end(id, null);
        return { ok: true };
      }
      get()._end(id, err);
      return { ok: false, error: err };
    }
  },

  /**
   * Acknowledge an announcement. Success is only ever reported after the
   * server confirms; a failure leaves it pending. Double submits are blocked.
   */
  async acknowledge(cashier, id) {
    if (get().pending[id] === 'ack') return { ok: false, busy: true };
    const { epoch } = get();
    const key = get().ackKeys[id] || newIdempotencyKey();
    set((s) => ({ ackKeys: { ...s.ackKeys, [id]: key } }));
    get()._begin(id, 'ack');
    try {
      const res = await acknowledgeAnnouncement(id, key);
      if (get().epoch !== epoch) return { ok: false, stale: true };
      if (!res?.notification?.announcement?.acknowledgedAt) {
        get()._end(id, { message: 'The server did not confirm the acknowledgement. Please try again.' });
        return { ok: false };
      }
      if (isForCashier(res.notification, cashier)) get()._apply(res.notification, res.unreadCount);
      set((s) => {
        const ackKeys = { ...s.ackKeys };
        delete ackKeys[id];
        return { ackKeys };
      });
      get()._end(id, null);
      return { ok: true };
    } catch (err) {
      if (get().epoch !== epoch) return { ok: false, stale: true };
      get()._end(id, err);
      return { ok: false, error: err };
    }
  },

  async loadSettings(cashier) {
    if (!get().bind(cashier)) return;
    const { epoch } = get();
    set((s) => ({ settings: { ...s.settings, status: 'loading', error: null } }));
    try {
      const res = await getNotificationSettings();
      if (get().epoch !== epoch) return;
      set((s) => ({ settings: { ...s.settings, status: 'ready', categories: res?.categories || [], error: null } }));
    } catch (err) {
      if (get().epoch !== epoch) return;
      set((s) => ({ settings: { ...s.settings, status: isUnavailable(err) ? 'unavailable' : 'error', error: err } }));
    }
  },

  /** Server-confirmed only: the toggle never flips until the PATCH succeeds. */
  async saveSetting(category, enabled) {
    const { epoch } = get();
    if (get().settings.pending[category]) return { ok: false, busy: true };
    set((s) => ({ settings: { ...s.settings, error: null, pending: { ...s.settings.pending, [category]: true } } }));
    const done = (extra) =>
      set((s) => {
        const pending = { ...s.settings.pending };
        delete pending[category];
        return { settings: { ...s.settings, pending, ...extra } };
      });
    try {
      const res = await updateNotificationSettings({ [category]: enabled });
      if (get().epoch !== epoch) return { ok: false, stale: true };
      done(res?.categories ? { categories: res.categories } : {});
      return { ok: true };
    } catch (err) {
      if (get().epoch !== epoch) return { ok: false, stale: true };
      done({ error: err });
      return { ok: false, error: err };
    }
  },
}));
