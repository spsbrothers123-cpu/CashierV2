// @vitest-environment jsdom
// Stage 4.5 — session & historical-data compatibility, cashier switching.
//
// EVERYTHING HERE IS MOCKED (apiClient / axios adapter). These tests prove
// Cashier-app behaviour only. They do NOT prove database-level isolation,
// replacement safety or history preservation — that is the job of the backend
// integration test (backendV2/test/cashierReplacement.integration.test.ts),
// which has to be run against an isolated database.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import { apiClient, isAuthInvalidation, getToken, setToken } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { useCartStore } from '@/store/cartStore';
import { SessionGate } from '@/routes/SessionGate';
import { SessionsPage } from '@/pages/cashier/SessionsPage';
import { HistoryPage } from '@/pages/cashier/HistoryPage';
import { HeldBills } from '@/components/pos/HeldBills';
import { CreditPaymentFields } from '@/components/payment/CreditPaymentFields';
import { ToastProvider } from '@/components/ui/Toast';
import { getHeldBills, holdBill, deleteHeldBill, checkoutBill, getBillHistory } from '@/api/bills';
import { searchCustomers, createCustomer } from '@/api/customers';
import { getCurrentSession, startSession, closeSession } from '@/api/session';
import { formatCurrency } from '@/utils/currency';

const A = { id: 'cashier-A', name: 'Asha', email: 'a@x.test', shop: { id: 'shop-1', name: 'Main Branch' } };
const B = { id: 'cashier-B', name: 'Bala', email: 'b@x.test', shop: { id: 'shop-1', name: 'Main Branch' } };
const sessionOf = (cashierId, over = {}) => ({
  id: `sess-${cashierId}`, cashierId, shopId: 'shop-1', status: 'active', startedAt: '2026-11-05T04:00:00.000Z',
  openingCash: 500, sales: 777, cashSales: 600, upiSales: 100, cardSales: 77, creditSales: 0, expectedCash: 1100, ...over,
});
const noSession = () => Promise.reject({ kind: 'not_found', code: 'NO_ACTIVE_SESSION', message: 'No active session.' });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};

function signIn(cashier) {
  useAuthStore.setState({ cashier, status: 'authenticated', error: null });
}
beforeEach(() => {
  setToken(null);
  useCartStore.setState({ items: [], customer: null });
  useAuthStore.setState({ cashier: null, status: 'unauthenticated', error: null });
  useSessionStore.getState().clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setToken(null);
});

const cartItem = { product: { id: 'p1', name: 'Eggs', price: 10, unit: 'tray', stock: 5 }, quantity: 2, unitPrice: 10 };

/* ───────────────────────── 1. Auth invalidation vs authorization denial ───────────────────────── */

describe('Stage 4.5 — which responses invalidate authentication', () => {
  it.each([
    [401, 'SESSION_EXPIRED', true],
    [401, undefined, true],
    [401, 'INVALID_CREDENTIALS', false], // failed login attempt: nothing to invalidate
    [403, 'ACCOUNT_NOT_ACTIVE', true],
    [403, 'ROLE_NOT_ALLOWED', false],
    [403, 'SHOP_MISMATCH', false],
    [403, 'NO_SHOP', false],
    [403, 'SHOP_ACCESS_DENIED', false],
    [403, 'BRANCH_HAS_CASHIER', false],
    [403, undefined, false],
    [404, 'NOT_FOUND', false],
    [409, 'SESSION_ALREADY_ACTIVE', false],
    [500, undefined, false],
  ])('status %i code %s -> invalidates auth: %s', (status, code, expected) => {
    expect(isAuthInvalidation(status, code)).toBe(expected);
  });

  // Drives the REAL response interceptor by making the axios adapter fail.
  async function failWith(status, code) {
    const original = apiClient.defaults.adapter;
    apiClient.defaults.adapter = (config) =>
      Promise.reject(Object.assign(new Error(`HTTP ${status}`), { config, isAxiosError: true, response: { status, data: { code, message: 'nope' }, config } }));
    try {
      await apiClient.get('/anything').catch((e) => e);
    } finally {
      apiClient.defaults.adapter = original;
    }
  }
  function seedSignedIn() {
    setToken('tok-A');
    signIn(A);
    useSessionStore.setState({ session: sessionOf(A.id), status: 'ready' });
    useCartStore.setState({ items: [cartItem], customer: { id: 'c1', name: 'Cust' } });
  }

  it.each([[401, 'SESSION_EXPIRED'], [403, 'ACCOUNT_NOT_ACTIVE']])(
    '%i %s: signs out locally and clears the cached session and cart',
    async (status, code) => {
      seedSignedIn();
      await failWith(status, code);
      expect(useAuthStore.getState().cashier).toBeNull();
      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(getToken()).toBeNull();
      expect(useSessionStore.getState().session).toBeNull();
      expect(useSessionStore.getState().status).toBe('idle');
      expect(useCartStore.getState().items).toEqual([]);
      expect(useCartStore.getState().customer).toBeNull();
    }
  );

  it.each([[403, 'ROLE_NOT_ALLOWED'], [403, 'SHOP_MISMATCH'], [403, 'NO_SHOP'], [403, undefined], [401, 'INVALID_CREDENTIALS'], [404, 'NOT_FOUND'], [500, undefined]])(
    '%i %s: ordinary denial/failure — the signed-in cashier, token, session and cart are untouched',
    async (status, code) => {
      seedSignedIn();
      await failWith(status, code);
      expect(useAuthStore.getState().cashier).toEqual(A);
      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(getToken()).toBe('tok-A');
      expect(useSessionStore.getState().session).toEqual(sessionOf(A.id));
      expect(useCartStore.getState().items).toHaveLength(1);
    }
  );

  it('the caller still receives the normalized error (kind + backend code) for a non-invalidating 403', async () => {
    seedSignedIn();
    const original = apiClient.defaults.adapter;
    apiClient.defaults.adapter = (config) =>
      Promise.reject(Object.assign(new Error('x'), { config, isAxiosError: true, response: { status: 403, data: { code: 'SHOP_MISMATCH', message: 'Wrong shop.' }, config } }));
    const err = await apiClient.post('/sessions/start', {}).catch((e) => e);
    apiClient.defaults.adapter = original;
    expect(err).toMatchObject({ kind: 'forbidden', code: 'SHOP_MISMATCH', message: 'Wrong shop.' });
  });
});

/* ───────────────────────── 2. Cashier switch regression (F1) ───────────────────────── */

describe('Stage 4.5 — cashier B never inherits cashier A’s session or cart (F1 regression)', () => {
  it('logout clears the cached session and the cart, even when the logout request fails', async () => {
    signIn(A);
    useSessionStore.setState({ session: sessionOf(A.id), status: 'ready' });
    useCartStore.setState({ items: [cartItem], customer: { id: 'c1' } });
    vi.spyOn(apiClient, 'post').mockRejectedValue({ kind: 'network', message: 'offline' });
    await useAuthStore.getState().logout().catch(() => {});
    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().status).toBe('idle');
    expect(useCartStore.getState().items).toEqual([]);
    expect(useAuthStore.getState().cashier).toBeNull();
  });

  it('A logs out, B logs in on the same tab: B starts with no session and an empty cart', async () => {
    signIn(A);
    useSessionStore.setState({ session: sessionOf(A.id), status: 'ready' });
    useCartStore.setState({ items: [cartItem] });
    vi.spyOn(apiClient, 'post').mockImplementation((url) =>
      url === '/auth/login' ? Promise.resolve({ data: { token: 'tok-B', cashier: B } }) : Promise.resolve({ data: {} })
    );
    await useAuthStore.getState().logout();
    const res = await useAuthStore.getState().login('b@x.test', 'pw');
    expect(res.ok).toBe(true);
    expect(useAuthStore.getState().cashier.id).toBe(B.id);
    expect(useSessionStore.getState().session).toBeNull();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('safety net: if the signed-in cashier changes by ANY path, the previous cashier’s state is dropped', () => {
    signIn(A);
    useSessionStore.setState({ session: sessionOf(A.id), status: 'ready' });
    useCartStore.setState({ items: [cartItem] });
    signIn(B); // e.g. a token swap / hydrate, with no explicit logout
    expect(useSessionStore.getState().session).toBeNull();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('does NOT clear anything when the same cashier is refreshed', () => {
    signIn(A);
    useSessionStore.setState({ session: sessionOf(A.id), status: 'ready' });
    useCartStore.setState({ items: [cartItem] });
    signIn({ ...A, name: 'Asha K' });
    expect(useSessionStore.getState().session).not.toBeNull();
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('a response for A that lands after B signed in is discarded', async () => {
    signIn(A);
    const slow = deferred();
    vi.spyOn(apiClient, 'get').mockReturnValue(slow.promise);
    const pending = useSessionStore.getState().loadSession(A.id);
    signIn(B); // switches cashier mid-request
    slow.resolve({ data: sessionOf(A.id) });
    await pending;
    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().status).toBe('idle');
  });

  it('a start-session response for A that lands after B signed in is discarded and reported as stale', async () => {
    signIn(A);
    const slow = deferred();
    vi.spyOn(apiClient, 'post').mockReturnValue(slow.promise);
    const pending = useSessionStore.getState().startSession({ cashierId: A.id, shopId: 'shop-1', openingCash: 100 });
    signIn(B);
    slow.resolve({ data: sessionOf(A.id) });
    expect(await pending).toMatchObject({ ok: false, stale: true });
    expect(useSessionStore.getState().session).toBeNull();
  });

  const renderGate = (onBilling) => {
    const Billing = () => {
      onBilling();
      return <div>BILLING SCREEN</div>;
    };
    return render(
      <MemoryRouter initialEntries={['/cashier/billing']}>
        <Routes>
          <Route path="/cashier/sessions" element={<div>SESSIONS SCREEN</div>} />
          <Route element={<SessionGate />}>
            <Route path="/cashier/billing" element={<Billing />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  it('SessionGate: a stored session that belongs to a different cashier is never let through; B’s own session is loaded', async () => {
    signIn(B);
    // Stale state that somehow survived (simulates a missed reset path).
    useSessionStore.setState({ session: sessionOf(A.id), status: 'ready' });
    const own = deferred();
    const get = vi.spyOn(apiClient, 'get').mockImplementation((url) => (url === '/sessions/current' ? own.promise : Promise.reject(new Error(url))));
    const billing = vi.fn();
    renderGate(billing);

    // While B's session is loading, A's session must not grant access.
    await waitFor(() => expect(get).toHaveBeenCalledWith('/sessions/current'));
    expect(billing).not.toHaveBeenCalled();
    expect(screen.queryByText('BILLING SCREEN')).toBeNull();

    own.resolve({ data: sessionOf(B.id) });
    expect(await screen.findByText('BILLING SCREEN')).toBeTruthy();
    expect(useSessionStore.getState().session.cashierId).toBe(B.id);
  });

  it('SessionGate: foreign session + B has no active session -> goes to the sessions page, never to billing', async () => {
    signIn(B);
    useSessionStore.setState({ session: sessionOf(A.id), status: 'ready' });
    vi.spyOn(apiClient, 'get').mockImplementation(() => noSession());
    const billing = vi.fn();
    renderGate(billing);
    expect(await screen.findByText('SESSIONS SCREEN')).toBeTruthy();
    expect(billing).not.toHaveBeenCalled();
  });

  it('SessionGate: the cashier’s own active session passes straight through; closed or missing redirects', async () => {
    signIn(A);
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: sessionOf(A.id) });
    renderGate(() => {});
    expect(await screen.findByText('BILLING SCREEN')).toBeTruthy();
    cleanup();

    useSessionStore.getState().clear();
    apiClient.get.mockResolvedValue({ data: sessionOf(A.id, { status: 'closed' }) });
    renderGate(() => {});
    expect(await screen.findByText('SESSIONS SCREEN')).toBeTruthy();
  });

  it('SessionsPage never shows a foreign session’s totals', async () => {
    signIn(B);
    useSessionStore.setState({ session: sessionOf(A.id, { sales: 98765 }), status: 'ready' });
    const own = deferred();
    vi.spyOn(apiClient, 'get').mockReturnValue(own.promise);
    render(
      <ToastProvider>
        <SessionsPage />
      </ToastProvider>
    );
    // Before B's own session arrives: no card with A's figures.
    expect(screen.queryByText(formatCurrency(98765))).toBeNull();
    expect(screen.queryByText('Current Session')).toBeNull();
  });
});

/* ───────────────────────── 3. Session open / close ───────────────────────── */

describe('Stage 4.5 — session start and close flows (mocked)', () => {
  const renderSessions = () =>
    render(
      <ToastProvider>
        <SessionsPage />
      </ToastProvider>
    );

  it('no open session: starts one with the opening cash and the cashier’s own shop, then shows the live summary', async () => {
    signIn(A);
    vi.spyOn(apiClient, 'get').mockImplementation(() => noSession());
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: sessionOf(A.id, { sales: 0, cashSales: 0, expectedCash: 500 }) });
    const user = userEvent.setup();
    renderSessions();
    await user.type(await screen.findByPlaceholderText('0.00'), '500');
    await user.click(screen.getByRole('button', { name: 'Start Session' }));
    expect(await screen.findByText('Current Session')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/sessions/start', { shopId: 'shop-1', openingCash: 500 });
    expect(JSON.stringify(post.mock.calls)).not.toMatch(/cashierId/);
    // Opening Cash and Expected Cash (both 500 for a brand-new session) are shown.
    expect(screen.getAllByText(formatCurrency(500), { selector: 'dd' })).toHaveLength(2);
  });

  it('SESSION_ALREADY_ACTIVE is shown and no second session is created locally', async () => {
    signIn(A);
    vi.spyOn(apiClient, 'get').mockImplementation(() => noSession());
    vi.spyOn(apiClient, 'post').mockRejectedValue({ kind: 'unknown', code: 'SESSION_ALREADY_ACTIVE', message: 'A session is already active. Close it before starting a new one.' });
    const user = userEvent.setup();
    renderSessions();
    await user.type(await screen.findByPlaceholderText('0.00'), '100');
    await user.click(screen.getByRole('button', { name: 'Start Session' }));
    expect(await screen.findByText(/already active/)).toBeTruthy();
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('open session: shows server-computed totals and closes only after an explicit confirmation step, posting the sessionId and amount', async () => {
    signIn(A);
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: sessionOf(A.id, { expectedCash: 1100 }) });
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: sessionOf(A.id, { status: 'closed', actualClosingCash: 1050, difference: -50, closedAt: '2026-11-05T10:00:00.000Z' }),
    });
    const user = userEvent.setup();
    renderSessions();
    expect(await screen.findByText('Current Session')).toBeTruthy();
    expect(screen.getByText(formatCurrency(1100), { selector: 'dd' })).toBeTruthy(); // Expected Cash is the backend's figure

    await user.click(screen.getByRole('button', { name: 'Close Session' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('0.00'), '1050');
    await user.click(within(dialog).getByRole('button', { name: 'Close Session' }));
    expect(post).not.toHaveBeenCalled(); // first click only asks for confirmation
    await user.click(within(dialog).getByRole('button', { name: 'Confirm & Close Session' }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith('/sessions/close', { sessionId: `sess-${A.id}`, actualClosingCash: 1050 });
    expect(await screen.findByText(formatCurrency(-50))).toBeTruthy(); // difference from the backend
  });

  it('SESSION_ALREADY_CLOSED is surfaced in the close dialog', async () => {
    signIn(A);
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: sessionOf(A.id) });
    vi.spyOn(apiClient, 'post').mockRejectedValue({ kind: 'unknown', code: 'SESSION_ALREADY_CLOSED', message: 'This session is already closed.' });
    const user = userEvent.setup();
    renderSessions();
    await screen.findByText('Current Session');
    await user.click(screen.getByRole('button', { name: 'Close Session' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('0.00'), '100');
    await user.click(within(dialog).getByRole('button', { name: 'Close Session' }));
    await user.click(within(dialog).getByRole('button', { name: 'Confirm & Close Session' }));
    expect(await within(dialog).findByText('This session is already closed.')).toBeTruthy();
  });

  it('closing a session never touches the cart or auth state (shift close is an explicit action)', async () => {
    signIn(A);
    useCartStore.setState({ items: [cartItem] });
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: sessionOf(A.id) });
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: sessionOf(A.id, { status: 'closed', actualClosingCash: 1100, difference: 0 }) });
    const res = await (async () => {
      await useSessionStore.getState().loadSession(A.id);
      return useSessionStore.getState().closeSession({ cashierId: A.id, actualClosingCash: 1100 });
    })();
    expect(res.ok).toBe(true);
    expect(useAuthStore.getState().cashier).toEqual(A);
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});

/* ───────────────────────── 4. Sales history ───────────────────────── */

describe('Stage 4.5 — sales history', () => {
  const bill = (over = {}) => ({
    id: 'b1', billNumber: 'RBR-0001', status: 'paid', grandTotal: 250, customer: null, createdAt: '2026-11-04T05:00:00.000Z',
    payments: [{ method: 'cash', amount: 250 }], items: [{ product: { id: 'p1', name: 'Eggs' }, productName: 'Eggs', quantity: 1, unitPrice: 250, lineTotal: 250 }], ...over,
  });
  const mockHistory = (impl) => vi.spyOn(apiClient, 'get').mockImplementation((url, config) => (url === '/bills/history' ? impl(config?.params) : Promise.reject(new Error(url))));
  const renderHistory = () => render(<HistoryPage />);
  const historyCalls = () => apiClient.get.mock.calls.filter((c) => c[0] === '/bills/history');

  it('always asks for cancelled bills too, and sends only filters (never a cashier id)', async () => {
    signIn(A);
    mockHistory(() => Promise.resolve({ data: [bill()] }));
    renderHistory();
    await screen.findByText('RBR-0001');
    const params = historyCalls()[0][1].params;
    expect(params.includeCancelled).toBe('true');
    expect(Object.keys(params).every((k) => ['shopId', 'query', 'paymentMethod', 'dateFrom', 'dateTo', 'includeCancelled'].includes(k))).toBe(true);
    expect(JSON.stringify(params)).not.toMatch(/cashierId/);
  });

  it('cancelled bills stay visible, are labelled Cancelled and cannot be reprinted; paid bills can', async () => {
    signIn(A);
    mockHistory(() =>
      Promise.resolve({
        data: [bill(), bill({ id: 'b2', billNumber: 'RBR-0002', status: 'cancelled', cancelledAt: '2026-11-04T06:00:00.000Z', cancelReason: 'Wrong item' })],
      })
    );
    renderHistory();
    const cancelledRow = (await screen.findByText('RBR-0002')).closest('tr');
    expect(within(cancelledRow).getByText('Cancelled')).toBeTruthy();
    expect(within(cancelledRow).queryByLabelText(/Reprint bill/)).toBeNull();
    expect(within(cancelledRow).getByLabelText('View bill RBR-0002')).toBeTruthy();
    const paidRow = screen.getByText('RBR-0001').closest('tr');
    expect(within(paidRow).getByText('Paid')).toBeTruthy();
    expect(within(paidRow).getByLabelText('Reprint bill RBR-0001')).toBeTruthy();
  });

  it('shows split payments, credit and walk-in/customer references from the backend payload', async () => {
    signIn(A);
    mockHistory(() =>
      Promise.resolve({
        data: [
          bill({ id: 'b3', billNumber: 'RBR-0003', payments: [{ method: 'cash', amount: 100 }, { method: 'upi', amount: 150 }] }),
          bill({ id: 'b4', billNumber: 'RBR-0004', customer: { id: 'c1', name: 'Ravi', phone: '999' }, payments: [{ method: 'credit', amount: 250 }] }),
        ],
      })
    );
    renderHistory();
    expect(within((await screen.findByText('RBR-0003')).closest('tr')).getByText('Split')).toBeTruthy();
    expect(within(screen.getByText('RBR-0003').closest('tr')).getByText('Walk-in')).toBeTruthy();
    const credit = screen.getByText('RBR-0004').closest('tr');
    expect(within(credit).getByText('Ravi')).toBeTruthy();
    expect(within(credit).getByText('Credit')).toBeTruthy();
  });

  it('the payment-method filter is sent to the backend', async () => {
    signIn(A);
    mockHistory(() => Promise.resolve({ data: [bill()] }));
    renderHistory();
    await screen.findByText('RBR-0001');
    await userEvent.setup().selectOptions(screen.getByLabelText('Filter by payment method'), 'credit');
    await waitFor(() => expect(historyCalls().some((c) => c[1].params.paymentMethod === 'credit')).toBe(true));
  });

  it('F4: a slower, older history response never overwrites a newer filter result', async () => {
    signIn(A);
    const slow = deferred();
    const fast = deferred();
    mockHistory((params) => (params?.paymentMethod === 'upi' ? fast.promise : slow.promise));
    renderHistory();
    await waitFor(() => expect(historyCalls().length).toBe(1)); // first (slow) request in flight
    await userEvent.setup().selectOptions(screen.getByLabelText('Filter by payment method'), 'upi');
    await waitFor(() => expect(historyCalls().some((c) => c[1].params.paymentMethod === 'upi')).toBe(true));

    fast.resolve({ data: [bill({ id: 'n', billNumber: 'NEWEST-UPI' })] });
    expect(await screen.findByText('NEWEST-UPI')).toBeTruthy();
    slow.resolve({ data: [bill({ id: 'o', billNumber: 'STALE-ALL' })] });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('STALE-ALL')).toBeNull();
    expect(screen.getByText('NEWEST-UPI')).toBeTruthy();
  });

  it('F4: an older failure cannot replace a newer successful result with an error', async () => {
    signIn(A);
    const slow = deferred();
    const fast = deferred();
    mockHistory((params) => (params?.paymentMethod === 'card' ? fast.promise : slow.promise));
    renderHistory();
    await waitFor(() => expect(historyCalls().length).toBe(1));
    await userEvent.setup().selectOptions(screen.getByLabelText('Filter by payment method'), 'card');
    await waitFor(() => expect(historyCalls().some((c) => c[1].params.paymentMethod === 'card')).toBe(true));
    fast.resolve({ data: [bill({ id: 'n', billNumber: 'CARD-OK' })] });
    await screen.findByText('CARD-OK');
    slow.reject({ kind: 'network', message: 'Old request failed' });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Old request failed')).toBeNull();
    expect(screen.getByText('CARD-OK')).toBeTruthy();
  });

  it('shows the error state with retry when history fails', async () => {
    signIn(A);
    mockHistory(() => Promise.reject({ kind: 'server', message: 'Server error. Please try again.' }));
    renderHistory();
    expect(await screen.findByText('Server error. Please try again.')).toBeTruthy();
  });
});

/* ───────────────────────── 5. Held bills ───────────────────────── */

describe('Stage 4.5 — held bills (API contract and list)', () => {
  it('hold sends product ids + quantities only — never a price, cashier or shop — even if the cart carries them', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'h1' } });
    await holdBill({
      label: 'Table 4',
      customer: { id: 'c1', name: 'Ravi', creditBalance: 50 },
      cashierId: A.id,
      shopId: 'shop-1',
      items: [{ product: { id: 'p1', name: 'Eggs', price: 999 }, quantity: 3, unitPrice: 999 }],
    });
    expect(post).toHaveBeenCalledWith('/bills/hold', { label: 'Table 4', customer: { id: 'c1' }, items: [{ product: { id: 'p1' }, quantity: 3 }] });
    expect(JSON.stringify(post.mock.calls)).not.toMatch(/unitPrice|price|cashierId|shopId/);
  });

  it('a walk-in hold sends customer: null', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
    await holdBill({ items: [{ product: { id: 'p1' }, quantity: 1 }] });
    expect(post.mock.calls[0][1].customer).toBeNull();
  });

  it('list and delete use the held-bill endpoints and return the backend payload untouched', async () => {
    const rows = [{ id: 'h1', label: 'Table 4', items: [], amount: 100, heldAt: '2026-11-05T01:00:00.000Z', customer: null }];
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: rows });
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { ok: true } });
    expect(await getHeldBills('shop-1')).toEqual(rows);
    expect(get.mock.calls[0][0]).toBe('/bills/held');
    await deleteHeldBill('h1');
    expect(del).toHaveBeenCalledWith('/bills/held/h1');
  });

  it('HeldBills renders exactly the bills the backend returned for this cashier, including walk-in and customer references', () => {
    const bills = [
      { id: 'h1', label: 'Table 4', items: [{ product: { id: 'p1', name: 'Eggs' }, quantity: 1 }], amount: 100, heldAt: '2026-11-05T01:00:00.000Z', customer: null },
      { id: 'h2', label: 'Ravi order', items: [{}, {}], amount: 200, heldAt: '2026-11-05T02:00:00.000Z', customer: { id: 'c1', name: 'Ravi' } },
    ];
    render(<HeldBills open onClose={() => {}} status="success" bills={bills} onResume={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Table 4')).toBeTruthy();
    expect(screen.getByText(/Walk-in/)).toBeTruthy();
    expect(screen.getByText(/Ravi •/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Resume' })).toHaveLength(2);
  });

  it('empty list: a replacement cashier starts with no held bills', () => {
    render(<HeldBills open onClose={() => {}} status="success" bills={[]} onResume={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('No held bills')).toBeTruthy();
  });
});

/* ───────────────────────── 6. Credit billing and customers ───────────────────────── */

describe('Stage 4.5 — credit billing and customer references', () => {
  it('credit checkout sends the customer id and a credit payment, with no price, cashier or shop', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'bill-1' } });
    await checkoutBill({
      customer: { id: 'c1', name: 'Ravi', creditBalance: 500 },
      cashierId: A.id,
      shopId: 'shop-1',
      items: [{ product: { id: 'p1', price: 10 }, quantity: 2, unitPrice: 10 }],
      payments: [{ method: 'credit', amount: 20 }],
      idempotencyKey: 'key-1',
    });
    expect(post).toHaveBeenCalledWith('/bills/checkout', {
      customer: { id: 'c1' },
      items: [{ product: { id: 'p1' }, quantity: 2 }],
      payments: [{ method: 'credit', amount: 20 }],
      idempotencyKey: 'key-1',
    });
    expect(JSON.stringify(post.mock.calls)).not.toMatch(/cashierId|shopId|unitPrice/);
  });

  it('credit billing without a customer is blocked in the UI with a way to select one', async () => {
    const onSelectCustomer = vi.fn();
    render(<CreditPaymentFields customer={null} grandTotal={100} onSelectCustomer={onSelectCustomer} />);
    expect(screen.getByText('A customer is required for credit billing')).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: /Select Customer/ }));
    expect(onSelectCustomer).toHaveBeenCalled();
  });

  it('with a customer it shows the existing credit and the new credit after this bill', () => {
    render(<CreditPaymentFields customer={{ id: 'c1', name: 'Ravi', creditBalance: 500 }} grandTotal={120} onSelectCustomer={() => {}} />);
    expect(screen.getByText(formatCurrency(500))).toBeTruthy();
    expect(screen.getByText(formatCurrency(620))).toBeTruthy();
  });

  it('customer search and create use the cashier endpoints and never send an owner/shop id', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ id: 'c1', name: 'Ravi' }] });
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'c2', name: 'Meena', phone: '98' } });
    expect(await searchCustomers('rav')).toEqual([{ id: 'c1', name: 'Ravi' }]);
    expect(get).toHaveBeenCalledWith('/customers', { params: { query: 'rav' } });
    await createCustomer({ name: 'Meena', phone: '98', cashierId: A.id, shopId: 'shop-1' });
    expect(post).toHaveBeenCalledWith('/customers', { name: 'Meena', phone: '98' });
  });
});

/* ───────────────────────── 7. Identity never goes on the wire ───────────────────────── */

describe('Stage 4.5 — the backend derives the cashier; the client never supplies it', () => {
  it('session, history, held-bill, checkout and customer calls carry no cashierId even when the caller has one', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
    vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: {} });
    await getCurrentSession(A.id);
    await startSession({ cashierId: A.id, shopId: 'shop-1', openingCash: 10 });
    await closeSession({ cashierId: A.id, sessionId: 's1', actualClosingCash: 10 });
    await getBillHistory({ shopId: 'shop-1', query: 'x' });
    await getHeldBills('shop-1');
    await searchCustomers('x');
    const wire = JSON.stringify([get.mock.calls, post.mock.calls]);
    expect(wire).not.toMatch(/cashierId|cashier-A/);
  });

  it('no Cashier source file stores a bill, held bill or customer list in browser storage (nothing carries over to the next cashier)', () => {
    const root = path.resolve(import.meta.dirname, '../src');
    const hits = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== 'stub') walk(full);
        } else if (/\.(jsx?|tsx?)$/.test(e.name)) {
          const src = fs.readFileSync(full, 'utf8');
          // The only permitted browser storage: the auth token (sessionStorage) and device settings (settingsStore).
          if (/(localStorage|sessionStorage)\.setItem/.test(src) && !/api\/client\.js$/.test(full)) hits.push(full);
          if (/persist\(/.test(src) && !/settingsStore\.js$/.test(full)) hits.push(full);
        }
      }
    };
    walk(root);
    expect(hits).toEqual([]);
  });
});
