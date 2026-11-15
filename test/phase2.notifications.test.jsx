// @vitest-environment jsdom
// Phase 2 — Cashier notification system (frontend only).
//
// EVERYTHING HERE IS MOCKED at the '@/api/notifications' boundary. BackendV2
// has no notification endpoints yet, so these tests prove Cashier-app
// behaviour against the PROPOSED contract only — not backend integration,
// authorization, event generation or real CSS layout (jsdom has no layout).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('@/api/notifications', () => ({
  listNotifications: vi.fn(),
  getNotification: vi.fn(),
  setReadState: vi.fn(),
  deleteNotification: vi.fn(),
  acknowledgeAnnouncement: vi.fn(),
  getNotificationSettings: vi.fn(),
  updateNotificationSettings: vi.fn(),
}));
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  fetchCurrentCashier: vi.fn(),
  logout: vi.fn(() => Promise.resolve({})),
}));

// The project does not ship @testing-library/jest-dom, so provide the few DOM
// matchers used here (no new dependency added).
expect.extend({
  toBeInTheDocument(el) {
    const pass = !!el && el.ownerDocument?.contains(el);
    return { pass, message: () => `expected element ${pass ? 'not ' : ''}to be in the document` };
  },
  toHaveTextContent(el, re) {
    const text = el?.textContent ?? '';
    const pass = re instanceof RegExp ? re.test(text) : text.includes(re);
    return { pass, message: () => `expected "${text}" ${pass ? 'not ' : ''}to match ${re}` };
  },
  toBeDisabled(el) {
    return { pass: !!el?.disabled, message: () => `expected element ${el?.disabled ? 'not ' : ''}to be disabled` };
  },
  toBeEnabled(el) {
    return { pass: !!el && !el.disabled, message: () => `expected element ${el && !el.disabled ? 'not ' : ''}to be enabled` };
  },
  toHaveAttribute(el, name, value) {
    const has = el?.hasAttribute(name);
    const pass = has && (value === undefined || el.getAttribute(name) === value);
    return { pass, message: () => `expected ${name}=${el?.getAttribute(name)} ${pass ? 'not ' : ''}to equal ${value}` };
  },
  toHaveValue(el, value) {
    return { pass: el?.value === value, message: () => `expected value "${el?.value}" ${el?.value === value ? 'not ' : ''}to be "${value}"` };
  },
});

import * as api from '@/api/notifications';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { TopHeader } from '@/components/layout/TopHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { CashierLayout } from '@/components/layout/CashierLayout';
import { NotificationsPage } from '@/pages/cashier/NotificationsPage';
import { routeForTarget, isForCashier } from '@/utils/notificationRoutes';

const A = { id: 'cashier-A', name: 'Asha', email: 'a@x.test', role: 'cashier', shop: { id: 'shop-1', name: 'Main Branch' } };
const B = { id: 'cashier-B', name: 'Bala', email: 'b@x.test', role: 'cashier', shop: { id: 'shop-2', name: 'North Branch' } };

let seq = 0;
const note = (over = {}) => ({
  id: `n${++seq}`,
  category: 'inventory',
  type: 'low_stock',
  severity: 'warning',
  title: `Low stock ${seq}`,
  message: `Only ${seq} left`,
  createdAt: '2026-11-06T04:00:00.000Z',
  readAt: null,
  recipientCashierId: 'cashier-A',
  shopId: 'shop-1',
  ...over,
});
const announcement = (over = {}) =>
  note({
    id: 'ann-n',
    category: 'announcement',
    type: 'announcement',
    severity: 'info',
    title: 'Diwali timings',
    message: 'Shop closes early',
    shopId: null,
    announcement: { id: 'ann_1', audience: 'all_cashiers', body: 'Shop closes at 6pm on Diwali.', requiresAcknowledgement: true, acknowledgedAt: null },
    ...over,
  });
const list = (items, over = {}) => Promise.resolve({ items, nextCursor: null, unreadCount: items.filter((n) => !n.readAt).length, ...over });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};
const signIn = (c) => useAuthStore.setState({ cashier: c, status: 'authenticated', error: null });

function Where() {
  const l = useLocation();
  return <div data-testid="loc">{l.pathname + l.search}</div>;
}
function renderPage(path = '/cashier/notifications') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Where />
      <Routes>
        <Route path="/cashier/notifications" element={<NotificationsPage />} />
        <Route path="*" element={<div>other</div>} />
      </Routes>
    </MemoryRouter>
  );
}
function renderHeader(path = '/cashier/billing') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Where />
      <TopHeader shop={A.shop} session={null} cashier={useAuthStore.getState().cashier} onOpenDrawer={() => {}} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  seq = 0;
  vi.clearAllMocks();
  useNotificationStore.getState().clear();
  useAuthStore.setState({ cashier: null, status: 'unauthenticated', error: null });
  signIn(A);
});
afterEach(cleanup);

describe('Notification bell', () => {
  it('renders in the existing header without removing it', async () => {
    api.listNotifications.mockReturnValue(list([]));
    renderHeader();
    expect(screen.getByRole('button', { name: /^notifications$/i })).toBeInTheDocument();
    expect(screen.getByText('Main Branch')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
  });

  it('shows a numeric unread counter and an accessible label; none when zero; 99+ cap', async () => {
    api.listNotifications.mockReturnValue(list([note(), note()], { unreadCount: 3 }));
    renderHeader();
    expect(await screen.findByTestId('unread-badge')).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument();
    cleanup();
    useNotificationStore.getState().clear();
    api.listNotifications.mockReturnValue(list([], { unreadCount: 250 }));
    renderHeader();
    expect(await screen.findByTestId('unread-badge')).toHaveTextContent('99+');
    cleanup();
    useNotificationStore.getState().clear();
    api.listNotifications.mockReturnValue(list([note({ readAt: 'x' })], { unreadCount: 0 }));
    renderHeader();
    await waitFor(() => expect(api.listNotifications).toHaveBeenCalled());
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
  });

  it('dropdown: loading → recent items, with View All and refresh', async () => {
    const d = deferred();
    api.listNotifications.mockReturnValue(d.promise);
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: /^notifications/i }));
    const dlg = screen.getByRole('dialog', { name: 'Notifications' });
    expect(within(dlg).getByRole('status', { name: /loading notifications/i })).toBeInTheDocument();
    await act(async () => d.resolve(await list([note({ title: 'Eggs low' }), note({ title: 'Session opened', category: 'session', readAt: 'x' })])));
    expect(await within(dlg).findByText('Eggs low')).toBeInTheDocument();
    expect(within(dlg).getByText('Session opened')).toBeInTheDocument();
    expect(within(dlg).getByRole('link', { name: /view all notifications/i })).toHaveAttribute('href', '/cashier/notifications');
    expect(api.listNotifications).toHaveBeenCalledWith(expect.objectContaining({ limit: 8 }));
    api.listNotifications.mockClear();
    await userEvent.click(within(dlg).getByRole('button', { name: /refresh notifications/i }));
    expect(api.listNotifications).toHaveBeenCalledTimes(1);
  });

  it('dropdown: empty state', async () => {
    api.listNotifications.mockReturnValue(list([]));
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: /^notifications/i }));
    expect(await screen.findByText('No notifications')).toBeInTheDocument();
  });

  it('dropdown: error state with retry that recovers', async () => {
    api.listNotifications.mockRejectedValueOnce({ kind: 'network', message: 'Network error. Check your connection and try again.' }).mockRejectedValueOnce({ kind: 'network', message: 'Network error.' });
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: /^notifications/i }));
    const dlg = screen.getByRole('dialog', { name: 'Notifications' });
    expect(await within(dlg).findByText(/network error/i)).toBeInTheDocument();
    api.listNotifications.mockReturnValue(list([note({ title: 'Recovered' })]));
    await userEvent.click(within(dlg).getByRole('button', { name: /try again/i }));
    expect(await within(dlg).findByText('Recovered')).toBeInTheDocument();
  });

  it('clicking a dropdown item navigates to the Center and does NOT mark it read', async () => {
    api.listNotifications.mockReturnValue(list([note({ id: 'x1', title: 'Eggs low' })]));
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: /^notifications/i }));
    await userEvent.click(await screen.findByRole('button', { name: /open notification: eggs low/i }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/cashier/notifications?open=x1');
    expect(api.setReadState).not.toHaveBeenCalled();
    expect(useNotificationStore.getState().recent.items[0].readAt).toBeNull();
  });

  it('dropdown closes on Escape, outside click and route change', async () => {
    api.listNotifications.mockReturnValue(list([]));
    renderHeader();
    const bell = screen.getByRole('button', { name: /^notifications/i });
    await userEvent.click(bell);
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    await userEvent.click(bell);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });
});

describe('Notification Center', () => {
  it('lists full history with category, severity, unread state and Open record only for supported targets', async () => {
    api.listNotifications.mockReturnValue(
      list([
        note({ id: 'p', title: 'Product low', target: { kind: 'product', id: 'prod_1' } }),
        note({ id: 'c', title: 'Credit overdue', category: 'credit', target: { kind: 'credit_customer', id: 'cu1' } }),
        note({ id: 's', title: 'Session closed', category: 'session', readAt: '2026-11-06T05:00:00Z' }),
      ])
    );
    renderPage();
    expect(await screen.findByText('Product low')).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(within(rows[0]).getByRole('link', { name: /open record/i })).toHaveAttribute('href', '/cashier/inventory');
    expect(within(rows[1]).queryByRole('link', { name: /open record/i })).not.toBeInTheDocument(); // no Cashier credit route exists
    expect(within(rows[0]).getByText('(unread)', { exact: false })).toBeInTheDocument();
    expect(within(rows[2]).getByText('(read)', { exact: false })).toBeInTheDocument();
    expect(screen.queryByLabelText(/branch/i)).not.toBeInTheDocument(); // no branch filter/selector
  });

  it('category filter is applied server-side', async () => {
    api.listNotifications.mockReturnValue(list([note()]));
    renderPage();
    await screen.findByText(/Low stock/);
    api.listNotifications.mockClear();
    api.listNotifications.mockReturnValue(list([note({ category: 'credit', title: 'Overdue credit' })]));
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'credit');
    await waitFor(() => expect(api.listNotifications).toHaveBeenCalledWith(expect.objectContaining({ category: 'credit' })));
    expect(await screen.findByText('Overdue credit')).toBeInTheDocument();
    expect(Array.from(screen.getByLabelText('Category').options).map((o) => o.textContent)).toEqual([
      'All categories', 'Inventory Alerts', 'Account & Security', 'Session', 'Admin Announcements', 'Credit',
    ]);
  });

  it('Unread tab filters server-side; All restores', async () => {
    api.listNotifications.mockReturnValue(list([note()]));
    renderPage();
    await screen.findByText(/Low stock/);
    api.listNotifications.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'Unread' }));
    await waitFor(() => expect(api.listNotifications).toHaveBeenCalledWith(expect.objectContaining({ status: 'unread' })));
    api.listNotifications.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => expect(api.listNotifications).toHaveBeenCalledWith(expect.objectContaining({ status: 'all' })));
  });

  it('date filter sends inclusive start/end-of-day bounds', async () => {
    api.listNotifications.mockReturnValue(list([note()]));
    renderPage();
    await screen.findByText(/Low stock/);
    api.listNotifications.mockClear();
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-11-05' } });
    await waitFor(() => {
      const last = api.listNotifications.mock.calls.at(-1)[0];
      expect(last.from).toBe(new Date('2026-11-01T00:00:00').toISOString());
      expect(last.to).toBe(new Date('2026-11-05T23:59:59.999').toISOString());
    });
  });

  it('empty-with-filters shows a clearable message', async () => {
    api.listNotifications.mockReturnValue(list([]));
    renderPage();
    await userEvent.selectOptions(await screen.findByLabelText('Category'), 'session');
    expect(await screen.findByText('No matching notifications')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    await waitFor(() => expect(screen.getByLabelText('Category')).toHaveValue(''));
  });

  it('paginates with Load more using the cursor and de-duplicates', async () => {
    const first = [note({ id: 'a', title: 'First' })];
    api.listNotifications.mockReturnValueOnce(list(first, { nextCursor: 'cur2', unreadCount: 2 }));
    renderPage();
    await screen.findByText('First');
    api.listNotifications.mockReturnValueOnce(list([note({ id: 'a', title: 'First' }), note({ id: 'b', title: 'Second' })], { nextCursor: null }));
    await userEvent.click(screen.getByRole('button', { name: /load more/i }));
    expect(await screen.findByText('Second')).toBeInTheDocument();
    expect(api.listNotifications).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'cur2' }));
    expect(screen.getAllByText('First')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('manual mark read / mark unread uses the server response and updates the unread count', async () => {
    const n = note({ id: 'r1', title: 'Eggs low' });
    api.listNotifications.mockReturnValue(list([n], { unreadCount: 1 }));
    renderPage();
    await screen.findByText('Eggs low');
    api.setReadState.mockResolvedValueOnce({ notification: { ...n, readAt: '2026-11-07T01:00:00Z' }, unreadCount: 0 });
    await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    expect(api.setReadState).toHaveBeenCalledWith('r1', true);
    expect(await screen.findByRole('button', { name: 'Mark as unread' })).toBeInTheDocument();
    expect(useNotificationStore.getState().unreadCount).toBe(0);
    api.setReadState.mockResolvedValueOnce({ notification: { ...n, readAt: null }, unreadCount: 1 });
    await userEvent.click(screen.getByRole('button', { name: 'Mark as unread' }));
    expect(api.setReadState).toHaveBeenLastCalledWith('r1', false);
    expect(await screen.findByRole('button', { name: 'Mark as read' })).toBeInTheDocument();
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });

  it('a failed read toggle shows an error and leaves the state unchanged', async () => {
    const n = note({ id: 'r2', title: 'Eggs low' });
    api.listNotifications.mockReturnValue(list([n]));
    renderPage();
    await screen.findByText('Eggs low');
    api.setReadState.mockRejectedValueOnce({ kind: 'server', message: 'Server error. Please try again.' });
    await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/server error/i);
    expect(screen.getByRole('button', { name: 'Mark as read' })).toBeInTheDocument();
  });

  it('opening details (button, deep link) and Open record never mark read', async () => {
    const n = note({ id: 'o1', title: 'Eggs low', target: { kind: 'product', id: 'p' } });
    api.listNotifications.mockReturnValue(list([n]));
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'View details' }));
    const dlg = await screen.findByRole('dialog', { name: 'Notification details' });
    expect(within(dlg).getByText('Unread')).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('link', { name: /open record/i }));
    expect(api.setReadState).not.toHaveBeenCalled();
    expect(screen.getByTestId('loc')).toHaveTextContent('/cashier/inventory');
    cleanup();

    // deep link for an id that is not on the loaded page → fetched, still not read
    api.getNotification.mockResolvedValue(note({ id: 'deep', title: 'Older one' }));
    api.listNotifications.mockReturnValue(list([]));
    renderPage('/cashier/notifications?open=deep');
    expect(await screen.findByRole('dialog', { name: 'Notification details' })).toHaveTextContent('Older one');
    expect(api.setReadState).not.toHaveBeenCalled();
  });

  it('delete is only offered when the server says canDelete, and removes the row on success', async () => {
    const keep = note({ id: 'k', title: 'Keep me' });
    const del = note({ id: 'd', title: 'Delete me', capabilities: { canDelete: true } });
    api.listNotifications.mockReturnValue(list([keep, del], { unreadCount: 2 }));
    renderPage();
    await screen.findByText('Delete me');
    expect(screen.getAllByRole('button', { name: /^delete/i })).toHaveLength(1);
    api.deleteNotification.mockResolvedValueOnce({ id: 'd', unreadCount: 1 });
    await userEvent.click(screen.getByRole('button', { name: /delete "delete me"/i }));
    await waitFor(() => expect(screen.queryByText('Delete me')).not.toBeInTheDocument());
    expect(screen.getByText('Keep me')).toBeInTheDocument();
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });
});

describe('Announcement acknowledgement', () => {
  it('keeps read and acknowledged separate: pending until acknowledged, acknowledging does not mark read', async () => {
    const a = announcement();
    api.listNotifications.mockReturnValue(list([a]));
    renderPage();
    expect(await screen.findByText('Acknowledgement pending')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View details' }));
    const dlg = await screen.findByRole('dialog', { name: 'Notification details' });
    expect(within(dlg).getByText('Acknowledgement required')).toBeInTheDocument();
    expect(within(dlg).getByText('Unread')).toBeInTheDocument();
    expect(within(dlg).getByText('Acknowledgement pending')).toBeInTheDocument();

    api.acknowledgeAnnouncement.mockResolvedValueOnce({
      notification: { ...a, announcement: { ...a.announcement, acknowledgedAt: '2026-11-07T02:00:00.000Z' } },
      unreadCount: 1,
    });
    await userEvent.click(within(dlg).getByRole('button', { name: /acknowledge/i }));
    expect(await within(dlg).findByText(/^Acknowledged /)).toBeInTheDocument();
    expect(within(dlg).getByText('Unread')).toBeInTheDocument(); // still unread
    expect(within(dlg).queryByRole('button', { name: /^acknowledge$/i })).not.toBeInTheDocument();
    expect(api.acknowledgeAnnouncement).toHaveBeenCalledTimes(1);
    expect(api.acknowledgeAnnouncement).toHaveBeenCalledWith('ann-n', expect.any(String));
    expect(api.setReadState).not.toHaveBeenCalled();
  });

  it('prevents duplicate submissions while one is in flight', async () => {
    const a = announcement();
    api.listNotifications.mockReturnValue(list([a]));
    renderPage('/cashier/notifications?open=ann-n');
    const dlg = await screen.findByRole('dialog', { name: 'Notification details' });
    const d = deferred();
    api.acknowledgeAnnouncement.mockReturnValue(d.promise);
    const btn = within(dlg).getByRole('button', { name: /acknowledge/i });
    await userEvent.click(btn);
    await userEvent.click(btn);
    fireEvent.click(btn);
    expect(api.acknowledgeAnnouncement).toHaveBeenCalledTimes(1);
    expect(btn).toBeDisabled();
    await act(async () => d.resolve({ notification: { ...a, announcement: { ...a.announcement, acknowledgedAt: '2026-11-07T02:00:00.000Z' } }, unreadCount: 1 }));
    expect(await within(dlg).findByText(/^Acknowledged /)).toBeInTheDocument();
  });

  it('a failed acknowledgement is never shown as success; retry reuses the same idempotency key', async () => {
    const a = announcement();
    api.listNotifications.mockReturnValue(list([a]));
    renderPage('/cashier/notifications?open=ann-n');
    const dlg = await screen.findByRole('dialog', { name: 'Notification details' });
    api.acknowledgeAnnouncement.mockRejectedValueOnce({ kind: 'network', message: 'Network error. Check your connection and try again.' });
    await userEvent.click(within(dlg).getByRole('button', { name: /acknowledge/i }));
    expect(await within(dlg).findByRole('alert')).toHaveTextContent(/could not acknowledge.*network error/i);
    expect(within(dlg).getByText('Acknowledgement pending')).toBeInTheDocument();
    expect(within(dlg).queryByText(/^Acknowledged /)).not.toBeInTheDocument();
    expect(within(dlg).getByRole('button', { name: /acknowledge/i })).toBeEnabled();

    api.acknowledgeAnnouncement.mockResolvedValueOnce({ notification: { ...a, announcement: { ...a.announcement, acknowledgedAt: '2026-11-07T02:00:00.000Z' } }, unreadCount: 1 });
    await userEvent.click(within(dlg).getByRole('button', { name: /acknowledge/i }));
    expect(await within(dlg).findByText(/^Acknowledged /)).toBeInTheDocument();
    const [k1, k2] = api.acknowledgeAnnouncement.mock.calls.map((c) => c[1]);
    expect(k1).toBe(k2);
  });

  it('a 200 without an acknowledgedAt is not treated as success', async () => {
    const a = announcement();
    api.listNotifications.mockReturnValue(list([a]));
    renderPage('/cashier/notifications?open=ann-n');
    const dlg = await screen.findByRole('dialog', { name: 'Notification details' });
    api.acknowledgeAnnouncement.mockResolvedValueOnce({ notification: a, unreadCount: 1 });
    await userEvent.click(within(dlg).getByRole('button', { name: /acknowledge/i }));
    expect(await within(dlg).findByRole('alert')).toBeInTheDocument();
    expect(within(dlg).queryByText(/^Acknowledged /)).not.toBeInTheDocument();
  });

  it('announcements that do not require acknowledgement show no acknowledge action', async () => {
    const a = announcement({ announcement: { id: 'ann_2', audience: 'individual', body: 'FYI', requiresAcknowledgement: false, acknowledgedAt: null } });
    api.listNotifications.mockReturnValue(list([a]));
    renderPage('/cashier/notifications?open=ann-n');
    const dlg = await screen.findByRole('dialog', { name: 'Notification details' });
    expect(within(dlg).getByText('Not required')).toBeInTheDocument();
    expect(within(dlg).queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
  });
});

describe('Cashier isolation', () => {
  it('logout clears all notification state', async () => {
    api.listNotifications.mockReturnValue(list([note({ title: 'Mine' })], { unreadCount: 4 }));
    await useNotificationStore.getState().loadRecent(A);
    await useNotificationStore.getState().loadPage(A);
    expect(useNotificationStore.getState().recent.items).toHaveLength(1);
    await useAuthStore.getState().logout();
    const s = useNotificationStore.getState();
    expect(s.recent.items).toEqual([]);
    expect(s.page.items).toEqual([]);
    expect(s.unreadCount).toBeNull();
    expect(s.ownerId).toBeNull();
  });

  it('switching cashier wipes state; a late response for the previous cashier cannot overwrite it', async () => {
    const slowA = deferred();
    api.listNotifications.mockReturnValueOnce(slowA.promise);
    const pA = useNotificationStore.getState().loadRecent(A);
    // cashier B signs in on the same tab before A's response arrives
    signIn(B);
    api.listNotifications.mockReturnValueOnce(list([note({ id: 'b1', title: 'For Bala', recipientCashierId: 'cashier-B', shopId: 'shop-2' })], { unreadCount: 1 }));
    await useNotificationStore.getState().loadRecent(B);
    await act(async () => {
      slowA.resolve(await list([note({ id: 'a1', title: 'For Asha' })], { unreadCount: 9 }));
      await pA;
    });
    const s = useNotificationStore.getState();
    expect(s.recent.items.map((n) => n.title)).toEqual(['For Bala']);
    expect(s.unreadCount).toBe(1);
    expect(s.ownerId).toBe('cashier-B');
  });

  it('auth change alone (without a reload) empties what the UI shows', async () => {
    api.listNotifications.mockReturnValue(list([note({ title: 'Asha only' })]));
    await useNotificationStore.getState().loadRecent(A);
    expect(useNotificationStore.getState().recent.items).toHaveLength(1);
    signIn(B);
    expect(useNotificationStore.getState().recent.items).toEqual([]);
    expect(useNotificationStore.getState().unreadCount).toBeNull();
  });

  it('a stale mutation result after a cashier switch is dropped', async () => {
    const n = note({ id: 'm1' });
    api.listNotifications.mockReturnValue(list([n]));
    await useNotificationStore.getState().loadRecent(A);
    const d = deferred();
    api.setReadState.mockReturnValue(d.promise);
    const p = useNotificationStore.getState().setRead(A, 'm1', true);
    signIn(B);
    await act(async () => {
      d.resolve({ notification: { ...n, readAt: 'x' }, unreadCount: 0 });
      await p;
    });
    expect(useNotificationStore.getState().recent.items).toEqual([]);
    expect(useNotificationStore.getState().unreadCount).toBeNull();
  });

  it('an older filter request resolving late cannot overwrite a newer one', async () => {
    const slow = deferred();
    api.listNotifications.mockReturnValueOnce(slow.promise);
    const p1 = useNotificationStore.getState().loadPage(A);
    api.listNotifications.mockReturnValueOnce(list([note({ title: 'Newest result' })]));
    await useNotificationStore.getState().loadPage(A);
    await act(async () => {
      slow.resolve(await list([note({ title: 'Stale result' })]));
      await p1;
    });
    expect(useNotificationStore.getState().page.items.map((n) => n.title)).toEqual(['Newest result']);
  });

  it('defence-in-depth: items addressed to another cashier or branch are dropped', async () => {
    api.listNotifications.mockReturnValue(
      list([
        note({ title: 'Mine' }),
        note({ title: 'Other cashier', recipientCashierId: 'cashier-B' }),
        note({ title: 'Other branch', shopId: 'shop-2', recipientCashierId: undefined }),
        announcement({ title: 'All-cashier announcement' }),
      ])
    );
    renderPage();
    await screen.findByText('Mine');
    expect(screen.getByText('All-cashier announcement')).toBeInTheDocument();
    expect(screen.queryByText('Other cashier')).not.toBeInTheDocument();
    expect(screen.queryByText('Other branch')).not.toBeInTheDocument();
    expect(isForCashier({ shopId: 'shop-1' }, A)).toBe(true);
    expect(isForCashier({ recipientCashierId: 'zzz' }, A)).toBe(false);
  });

  it('never persists notifications to browser storage', async () => {
    api.listNotifications.mockReturnValue(list([note({ title: 'Secretish' })]));
    await useNotificationStore.getState().loadRecent(A);
    expect(JSON.stringify({ ...localStorage })).not.toMatch(/Secretish/);
    expect(JSON.stringify({ ...sessionStorage })).not.toMatch(/Secretish/);
  });
});

describe('Failure and retry', () => {
  it('page: load failure shows error, Try again recovers', async () => {
    api.listNotifications.mockRejectedValueOnce({ kind: 'server', message: 'Server error. Please try again.' });
    renderPage();
    expect(await screen.findByText(/server error/i)).toBeInTheDocument();
    api.listNotifications.mockReturnValue(list([note({ title: 'Back again' })]));
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Back again')).toBeInTheDocument();
  });

  it('page: a failed Load more keeps loaded items and offers another try', async () => {
    api.listNotifications.mockReturnValueOnce(list([note({ title: 'Loaded' })], { nextCursor: 'c2' }));
    renderPage();
    await screen.findByText('Loaded');
    api.listNotifications.mockRejectedValueOnce({ kind: 'network', message: 'Network error.' });
    await userEvent.click(screen.getByRole('button', { name: /load more/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load more/i);
    expect(screen.getByText('Loaded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load more/i })).toBeEnabled();
  });
});

describe('Notification settings', () => {
  const openSettings = async () => {
    api.listNotifications.mockReturnValue(list([]));
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: 'Settings' }));
  };

  it('shows all five categories as UNAVAILABLE (no fake local settings) when the backend lacks the endpoint', async () => {
    api.getNotificationSettings.mockRejectedValue({ kind: 'not_found', message: 'Not found.' });
    await openSettings();
    expect(await screen.findByText(/not available yet/i)).toBeInTheDocument();
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(5);
    switches.forEach((s) => expect(s).toBeDisabled());
    expect(screen.getAllByText('Unavailable')).toHaveLength(5);
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it('mandatory categories are locked; mutable ones change only after the server confirms', async () => {
    const cats = (inv) => [
      { category: 'inventory', enabled: inv, mutable: true },
      { category: 'account_security', enabled: true, mutable: false, mandatoryReason: 'Security notifications cannot be turned off.' },
      { category: 'session', enabled: true, mutable: true },
      { category: 'announcement', enabled: true, mutable: true },
      { category: 'credit', enabled: true, mutable: true },
    ];
    api.getNotificationSettings.mockResolvedValue({ categories: cats(true) });
    await openSettings();
    const sec = await screen.findByRole('switch', { name: 'Account & Security' });
    expect(sec).toBeDisabled();
    expect(screen.getByText(/cannot be turned off/i)).toBeInTheDocument();

    const inv = screen.getByRole('switch', { name: 'Inventory Alerts' });
    // failure → stays on, error shown
    api.updateNotificationSettings.mockRejectedValueOnce({ kind: 'server', message: 'Server error. Please try again.' });
    await userEvent.click(inv);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);
    expect(screen.getByRole('switch', { name: 'Inventory Alerts' })).toHaveAttribute('aria-checked', 'true');
    // success → reflects server response
    api.updateNotificationSettings.mockResolvedValueOnce({ categories: cats(false) });
    await userEvent.click(screen.getByRole('switch', { name: 'Inventory Alerts' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Inventory Alerts' })).toHaveAttribute('aria-checked', 'false'));
    expect(api.updateNotificationSettings).toHaveBeenLastCalledWith({ inventory: false });
  });

  it('settings load failure (non-404) offers retry', async () => {
    api.getNotificationSettings.mockRejectedValueOnce({ kind: 'server', message: 'Server error. Please try again.' });
    await openSettings();
    expect(await screen.findByText(/server error/i)).toBeInTheDocument();
    api.getNotificationSettings.mockResolvedValue({ categories: [] });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(5));
  });
});

describe('Related-record routing + API layer', () => {
  it('maps only known kinds to existing Cashier routes; never a server URL', () => {
    expect(routeForTarget({ kind: 'product' })).toBe('/cashier/inventory');
    expect(routeForTarget({ kind: 'session' })).toBe('/cashier/sessions');
    expect(routeForTarget({ kind: 'account' })).toBe('/cashier/profile');
    expect(routeForTarget({ kind: 'bill' })).toBe('/cashier/history');
    expect(routeForTarget({ kind: 'credit_customer' })).toBeNull();
    expect(routeForTarget({ kind: 'https://evil.example', url: 'https://evil.example' })).toBeNull();
    expect(routeForTarget({ kind: 'constructor' })).toBeNull();
    expect(routeForTarget(null)).toBeNull();
  });
});

describe('Mobile / responsive (markup-level only — jsdom has no layout engine)', () => {
  it('bottom nav "More" shows an unread indicator; the drawer lists Notifications with a count', async () => {
    api.listNotifications.mockReturnValue(list([note()], { unreadCount: 5 }));
    await useNotificationStore.getState().loadRecent(A);
    render(
      <MemoryRouter>
        <MobileBottomNav onOpenMore={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('more-unread-dot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /more, 5 unread notifications/i })).toBeInTheDocument();
    cleanup();

    render(
      <MemoryRouter initialEntries={['/cashier/sessions']}>
        <Routes>
          <Route element={<CashierLayout />}>
            <Route path="/cashier/sessions" element={<div>sessions</div>} />
            <Route path="/cashier/notifications" element={<div>center</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    const drawerNav = screen.getByRole('navigation', { name: 'Full navigation', hidden: true });
    const link = within(drawerNav).getByRole('link', { name: /notifications/i, hidden: true });
    expect(link).toHaveAttribute('href', '/cashier/notifications');
    expect(link).toHaveTextContent('5');
    // header bell is available on mobile too (no lg:-only class on the bell)
    const bell = screen.getByRole('button', { name: /notifications, 5 unread/i });
    expect(bell.className).not.toMatch(/\bhidden\b/);
  });

  it('dropdown uses a full-width fixed panel on small screens and an anchored panel from sm up', async () => {
    api.listNotifications.mockReturnValue(list([]));
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: /^notifications/i }));
    const cls = screen.getByRole('dialog', { name: 'Notifications' }).className;
    expect(cls).toMatch(/fixed/);
    expect(cls).toMatch(/inset-x-3/);
    expect(cls).toMatch(/sm:absolute/);
    expect(cls).toMatch(/sm:w-\[24rem\]/);
  });
});
