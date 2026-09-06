/**
 * STUB API ADAPTER — DEVELOPMENT ONLY. See mockData.js header.
 *
 * Every function here mirrors the signature/shape the real API module
 * (auth.js, session.js, products.js, customers.js, bills.js) will call
 * on apiClient once a backend exists. Swapping USE_STUB_API to false
 * in client.js is the only change needed — callers never touch this
 * file directly.
 */
import {
  STUB_SHOP,
  STUB_CASHIERS,
  STUB_PRODUCTS,
  STUB_CATEGORIES,
  STUB_CUSTOMERS,
  STUB_INVITE_CODES,
  stubState,
} from './mockData';

const LATENCY = 450;
const wait = (ms = LATENCY) => new Promise((res) => setTimeout(res, ms));

// --- Signup / OTP config (stub-only) ---------------------------------
const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_S = 45;
const OTP_MAX_ATTEMPTS = 5;

function makeToken(cashierId) {
  return `stub.${cashierId}.${Date.now()}`;
}

function makeRequestId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `signup_${crypto.randomUUID()}`;
  return `signup_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function generateOtp() {
  return String(Math.floor(Math.random() * 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

/**
 * TEMPORARY FRONTEND DEVELOPMENT ADAPTER
 * There is no email/SMTP backend yet, so the OTP a real cashier would
 * receive by email is instead logged to the console. This is the ONLY
 * place the code is ever exposed — components never read it directly,
 * they only call verifySignupOtp() with whatever the user typed.
 * Delete this whole src/api/stub directory once the real backend
 * (with real email delivery) exists.
 */
function deliverOtpToDevConsole(email, code) {
  // eslint-disable-next-line no-console
  console.info(`[DEV ONLY — no email backend yet] Egg Mart signup OTP for ${email}: ${code}`);
}

function cashierFromToken(token) {
  const id = token?.split('.')?.[1];
  return STUB_CASHIERS.find((c) => c.id === id) || null;
}

function publicCashier(c) {
  if (!c) return null;
  // eslint-disable-next-line no-unused-vars
  const { password, ...rest } = c;
  return { ...rest, shop: STUB_SHOP };
}

function err(status, message) {
  const e = new Error(message);
  e.response = { status, data: { message } };
  return e;
}

const PAYMENT_METHOD_KEYS = { cash: 'cashSales', card: 'cardSales', upi: 'upiSales', credit: 'creditSales' };

/** Sums a session's completed bills into the shape the UI expects on the
 * Session/Reports screens. This mirrors what a real backend would compute
 * server-side — the frontend never derives these numbers on its own. */
function summarizeBills(bills) {
  const summary = { sales: 0, billCount: bills.length, cashSales: 0, cardSales: 0, upiSales: 0, creditSales: 0 };
  for (const bill of bills) {
    summary.sales += bill.grandTotal;
    for (const p of bill.payments) {
      const key = PAYMENT_METHOD_KEYS[p.method];
      if (key) summary[key] += p.amount;
    }
  }
  return summary;
}

function sessionWithSummary(session) {
  if (!session) return null;
  const bills = stubState.bills.filter((b) => b.sessionId === session.id);
  const summary = summarizeBills(bills);
  return { ...session, ...summary, expectedCash: session.openingCash + summary.cashSales };
}

export const stubApi = {
  async login({ email, password }) {
    await wait();
    const cashier = STUB_CASHIERS.find((c) => c.email.toLowerCase() === String(email).toLowerCase());
    if (!cashier) {
      const err = new Error('Invalid credentials.');
      err.response = { status: 401, data: { message: 'No account found with that email.' } };
      throw err;
    }
    if (cashier.password !== password) {
      const err = new Error('Invalid credentials.');
      err.response = { status: 401, data: { message: 'Incorrect password.' } };
      throw err;
    }
    if (!cashier.active) {
      const err = new Error('Inactive account.');
      err.response = { status: 403, data: { message: 'This account has been deactivated. Contact your shop admin.' } };
      throw err;
    }
    return { token: makeToken(cashier.id), cashier: publicCashier(cashier) };
  },

  async me(token) {
    await wait(200);
    const cashier = cashierFromToken(token);
    if (!cashier) {
      const err = new Error('Unauthorized.');
      err.response = { status: 401, data: { message: 'Session expired. Please log in again.' } };
      throw err;
    }
    return publicCashier(cashier);
  },

  async logout() {
    await wait(150);
    return { ok: true };
  },

  // --- Cashier signup (Invite Code -> Account -> Email OTP -> Pending admin approval) ---

  async verifyInvitationCode({ code }) {
    await wait(400);
    const trimmed = String(code || '').trim();
    const entry = STUB_INVITE_CODES.find((c) => c.code === trimmed);
    if (!entry) {
      throw err(422, 'Invalid invitation code. Check with your shop admin and try again.');
    }
    if (entry.used) {
      throw err(409, 'This invitation code has already been used.');
    }
    // Not marked used yet — that happens once signup actually completes,
    // so a cashier who abandons the Account Details step can still retry
    // with the same code. A real backend should scope/expire these per shop.
    return { verificationToken: `invite.${entry.code}.${Date.now()}` };
  },

  async signup({ name, email, password, branchName, verificationToken }) {
    await wait();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!verificationToken) {
      throw err(401, 'Your invitation code verification has expired. Please start over.');
    }
    const existingCashier = STUB_CASHIERS.find((c) => c.email.toLowerCase() === normalizedEmail);
    if (existingCashier) {
      throw err(409, 'An account with this email already exists. Try logging in instead.');
    }
    const existingRequest = Object.values(stubState.signupRequests).find(
      (r) => r.email.toLowerCase() === normalizedEmail && r.status !== 'rejected'
    );
    if (existingRequest?.status === 'pending_approval') {
      throw err(409, 'A signup request for this email is already awaiting admin approval.');
    }

    const requestId = makeRequestId();
    const code = generateOtp();
    const now = Date.now();
    stubState.signupRequests[requestId] = {
      id: requestId,
      name: name.trim(),
      email: normalizedEmail,
      password, // stub only — a real backend must hash this and never echo it back
      branchName: branchName?.trim() || '',
      status: 'otp_pending', // otp_pending | pending_approval | approved | rejected
      otp: { code, expiresAt: now + OTP_TTL_MS, attempts: 0 },
      lastSentAt: now,
      createdAt: new Date(now).toISOString(),
    };

    // Mark the invitation code consumed once the signup request is created.
    const inviteCode = verificationToken.split('.')[1];
    const inviteEntry = STUB_INVITE_CODES.find((c) => c.code === inviteCode);
    if (inviteEntry) inviteEntry.used = true;

    deliverOtpToDevConsole(normalizedEmail, code);

    return { requestId, email: normalizedEmail, resendCooldownSeconds: OTP_RESEND_COOLDOWN_S };
  },

  async verifySignupOtp({ requestId, code }) {
    await wait(400);
    const request = stubState.signupRequests[requestId];
    if (!request) throw err(404, 'This signup request could not be found. Please sign up again.');
    if (request.status === 'pending_approval' || request.status === 'approved') {
      // Already verified (e.g. duplicate submit) — treat as success, idempotently.
      return { ok: true, status: request.status };
    }

    if (Date.now() > request.otp.expiresAt) {
      throw err(410, 'This verification code has expired. Request a new code.');
    }
    if (request.otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw err(429, 'Too many incorrect attempts. Request a new code.');
    }
    if (String(code).trim() !== request.otp.code) {
      request.otp.attempts += 1;
      throw err(401, 'Invalid verification code. Please try again.');
    }

    request.status = 'pending_approval';
    request.verifiedAt = new Date().toISOString();
    return { ok: true, status: request.status };
  },

  async resendSignupOtp({ requestId }) {
    await wait(350);
    const request = stubState.signupRequests[requestId];
    if (!request) throw err(404, 'This signup request could not be found. Please sign up again.');
    if (request.status !== 'otp_pending') {
      return { ok: true, status: request.status };
    }

    const secondsSinceLastSend = (Date.now() - request.lastSentAt) / 1000;
    if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_S) {
      throw err(429, 'Please wait before requesting another code.');
    }

    const code = generateOtp();
    request.otp = { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 };
    request.lastSentAt = Date.now();
    deliverOtpToDevConsole(request.email, code);

    return { ok: true, resendCooldownSeconds: OTP_RESEND_COOLDOWN_S };
  },

  async getSignupStatus({ requestId }) {
    await wait(250);
    const request = stubState.signupRequests[requestId];
    if (!request) throw err(404, 'This signup request could not be found.');
    return { status: request.status, name: request.name, email: request.email };
  },

  async getCurrentSession(cashierId) {
    await wait(250);
    return sessionWithSummary(stubState.sessions[cashierId]);
  },

  async startSession({ cashierId, shopId, openingCash }) {
    await wait();
    if (stubState.sessions[cashierId]?.status === 'active') {
      throw err(409, 'An active session already exists for this cashier.');
    }
    const session = {
      id: `sess_${Date.now()}`,
      cashierId,
      shopId,
      status: 'active',
      startedAt: new Date().toISOString(),
      openingCash: Number(openingCash),
    };
    stubState.sessions[cashierId] = session;
    return sessionWithSummary(session);
  },

  async closeSession({ cashierId, sessionId, actualClosingCash }) {
    await wait();
    const session = stubState.sessions[cashierId];
    if (!session || session.id !== sessionId || session.status !== 'active') {
      throw err(409, 'No active session found to close.');
    }
    const summarized = sessionWithSummary(session);
    const closed = {
      ...session,
      status: 'closed',
      closedAt: new Date().toISOString(),
      actualClosingCash: Number(actualClosingCash),
      expectedCash: summarized.expectedCash,
      difference: Number(actualClosingCash) - summarized.expectedCash,
      sales: summarized.sales,
      billCount: summarized.billCount,
      cashSales: summarized.cashSales,
      cardSales: summarized.cardSales,
      upiSales: summarized.upiSales,
      creditSales: summarized.creditSales,
    };
    stubState.sessions[cashierId] = closed;
    return closed;
  },

  async searchProducts({ query = '', category = '', barcode = '' }) {
    await wait(300);
    let results = STUB_PRODUCTS;
    if (barcode) {
      results = results.filter((p) => p.barcode === barcode);
    } else {
      if (category && category !== 'All') results = results.filter((p) => p.category === category);
      if (query) {
        const q = query.toLowerCase();
        results = results.filter(
          (p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(q)
        );
      }
    }
    return results;
  },

  async getCategories() {
    await wait(150);
    return STUB_CATEGORIES;
  },

  async searchCustomers(query = '') {
    await wait(300);
    if (!query) return STUB_CUSTOMERS;
    const q = query.toLowerCase();
    return STUB_CUSTOMERS.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  },

  async createCustomer({ name, phone }) {
    await wait(350);
    const trimmedName = String(name || '').trim();
    const trimmedPhone = String(phone || '').trim();
    if (!trimmedName) throw err(422, 'Customer name is required.');
    if (!/^\d{10}$/.test(trimmedPhone)) throw err(422, 'Enter a valid 10-digit phone number.');

    const existing = STUB_CUSTOMERS.find((c) => c.phone === trimmedPhone);
    if (existing) throw err(409, 'A customer with this phone number already exists.');

    const customer = { id: `c_${Date.now()}`, name: trimmedName, phone: trimmedPhone, creditBalance: 0 };
    // Cashier-created customers go through the same list an Admin would see —
    // Phase 2 should persist this the same way an Admin-created customer is.
    STUB_CUSTOMERS.unshift(customer);
    return customer;
  },

  async holdBill(bill) {
    await wait(300);
    const held = { ...bill, id: `hold_${Date.now()}`, heldAt: new Date().toISOString() };
    stubState.heldBills.push(held);
    return held;
  },

  async getHeldBills(shopId) {
    await wait(250);
    return stubState.heldBills.filter((b) => !shopId || b.shopId === shopId);
  },

  async deleteHeldBill(id) {
    await wait(200);
    stubState.heldBills = stubState.heldBills.filter((b) => b.id !== id);
    return { ok: true };
  },

  async checkoutBill(payload) {
    await wait(600);
    const { idempotencyKey, items, payments, grandTotal } = payload;

    // Idempotency: replaying the same key returns the original bill instead
    // of creating a duplicate — mirrors what the real checkout endpoint must
    // guarantee for double-click / retry safety.
    if (idempotencyKey) {
      const existing = stubState.bills.find((b) => b.idempotencyKey === idempotencyKey);
      if (existing) return existing;
    }

    if (!items || items.length === 0) throw err(400, 'Cannot check out an empty bill.');
    if (!payments || payments.length === 0) throw err(400, 'At least one payment is required.');

    const paid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    // Never trust the frontend's own arithmetic — re-validate server-side
    // (here: stub-side) exactly like a real backend must.
    if (Math.round((paid - grandTotal) * 100) !== 0) {
      throw err(422, `Payment total (₹${paid.toFixed(2)}) does not match bill total (₹${grandTotal.toFixed(2)}).`);
    }

    for (const p of payments) {
      if (!['cash', 'card', 'upi', 'credit'].includes(p.method)) {
        throw err(422, `Unsupported payment method: ${p.method}`);
      }
      if (!(Number(p.amount) > 0)) throw err(422, 'Each payment must be greater than zero.');
    }

    // Reduce stock for realism (a real backend would do this transactionally).
    for (const { product, quantity } of items) {
      const stocked = STUB_PRODUCTS.find((p) => p.id === product.id);
      if (stocked) stocked.stock = Math.max(0, stocked.stock - quantity);
    }

    stubState.billSeq += 1;
    const bill = {
      ...payload,
      id: `bill_${Date.now()}`,
      billNumber: `EM-${stubState.billSeq}`,
      status: 'paid',
      createdAt: new Date().toISOString(),
    };
    stubState.bills.unshift(bill);
    return bill;
  },

  async getBillHistory({ shopId, cashierId, query = '', dateFrom, dateTo, paymentMethod, customerId } = {}) {
    await wait(350);
    let results = stubState.bills.filter((b) => !shopId || b.shopId === shopId);
    if (cashierId) results = results.filter((b) => b.cashierId === cashierId);
    if (paymentMethod) results = results.filter((b) => b.payments.some((p) => p.method === paymentMethod));
    if (customerId) results = results.filter((b) => b.customer?.id === customerId);
    if (dateFrom) results = results.filter((b) => new Date(b.createdAt) >= new Date(dateFrom));
    if (dateTo) results = results.filter((b) => new Date(b.createdAt) <= new Date(dateTo));
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (b) =>
          b.billNumber.toLowerCase().includes(q) ||
          b.customer?.name?.toLowerCase().includes(q) ||
          b.customer?.phone?.includes(q)
      );
    }
    return results;
  },

  async getBillById(id) {
    await wait(200);
    const bill = stubState.bills.find((b) => b.id === id);
    if (!bill) throw err(404, 'Bill not found.');
    return bill;
  },

  async getSalesReport({ shopId, cashierId, from, to } = {}) {
    await wait(400);
    let bills = stubState.bills.filter((b) => !shopId || b.shopId === shopId);
    if (cashierId) bills = bills.filter((b) => b.cashierId === cashierId);
    if (from) bills = bills.filter((b) => new Date(b.createdAt) >= new Date(from));
    if (to) bills = bills.filter((b) => new Date(b.createdAt) <= new Date(to));

    const summary = summarizeBills(bills);
    const averageBillValue = bills.length ? summary.sales / bills.length : 0;

    const productTotals = new Map();
    for (const bill of bills) {
      for (const { product, quantity } of bill.items) {
        const entry = productTotals.get(product.id) || { name: product.name, quantity: 0, revenue: 0 };
        entry.quantity += quantity;
        entry.revenue += product.price * quantity;
        productTotals.set(product.id, entry);
      }
    }
    const topProducts = [...productTotals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Daily trend bucketed by calendar day within the filtered range.
    const trendMap = new Map();
    for (const bill of bills) {
      const day = bill.createdAt.slice(0, 10);
      trendMap.set(day, (trendMap.get(day) || 0) + bill.grandTotal);
    }
    const trend = [...trendMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([label, value]) => ({ label, value }));

    return { ...summary, averageBillValue, topProducts, trend };
  },
};
