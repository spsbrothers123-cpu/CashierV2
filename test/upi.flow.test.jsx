// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

vi.mock('@/api/upi', () => ({ requestUpiQr: vi.fn() }));
vi.mock('@/api/bills', () => ({ checkoutBill: vi.fn() }));

import { requestUpiQr } from '@/api/upi';
import { checkoutBill } from '@/api/bills';
import { PaymentModal } from '@/components/payment/PaymentModal';

const qrFor = (amount) => ({
  payeeName: 'Egg Mart Main',
  upiId: 'eggmart@upi',
  upiUri: `upi://pay?pa=eggmart%40upi&pn=Egg%20Mart%20Main&am=${amount}&cu=INR`,
});

const items = [{ product: { id: 'p1', name: 'Eggs', price: 500 }, quantity: 1, unitPrice: 500 }];
const base = {
  open: true,
  cashier: { id: 'c1', name: 'John', shop: { id: 's1', name: 'Main' } },
  session: { id: 'sess1' },
  items,
  customer: null,
  totals: { subtotal: 500, discount: 0, tax: 0, grandTotal: 500 },
  onSuccess: vi.fn(),
  onSelectCustomer: vi.fn(),
  onViewBill: vi.fn(),
};
const setup = (props = {}) => {
  const onClose = vi.fn();
  render(<PaymentModal {...base} onClose={onClose} initialMethod="cash" {...props} />);
  return { onClose };
};
const popup = () => screen.queryByRole('dialog', { name: 'UPI Payment' });
const refInput = () => screen.getByLabelText('UPI transaction reference');
const confirmBtn = () => screen.getByRole('button', { name: 'Confirm Payment' });

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  requestUpiQr.mockImplementation(async ({ amount }) => qrFor(amount));
  checkoutBill.mockImplementation(async (p) => ({
    ...p, id: 'b1', billNumber: 'EM-1', status: 'paid', createdAt: new Date().toISOString(),
  }));
});

describe('single mode', () => {
  it('auto-opens when UPI is preselected, QR is for the payable amount, ref is mandatory', async () => {
    setup({ initialMethod: 'upi' });
    expect(popup()).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('img', { name: 'UPI payment QR code' })).toBeTruthy());
    expect(requestUpiQr).toHaveBeenCalledTimes(1);
    expect(requestUpiQr.mock.calls[0][0].amount).toBe('500.00');
    expect(screen.getByText('Egg Mart Main')).toBeTruthy();
    expect(screen.getByText('eggmart@upi')).toBeTruthy();
    expect(confirmBtn().disabled).toBe(true);                       // no reference yet
    fireEvent.change(refInput(), { target: { value: 'ab12' } });
    expect(confirmBtn().disabled).toBe(true);                       // too short
    fireEvent.change(refInput(), { target: { value: 'ab 1234' } });
    expect(confirmBtn().disabled).toBe(true);                       // space
    expect(checkoutBill).not.toHaveBeenCalled();
  });

  it('confirm submits ONE checkout with the normalized reference; double click cannot duplicate', async () => {
    setup({ initialMethod: 'upi' });
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
    let release;
    checkoutBill.mockImplementationOnce((p) => new Promise((r) => { release = () => r({ ...p, id: 'b1', billNumber: 'EM-1', createdAt: '2026-10-19T00:00:00Z' }); }));
    fireEvent.change(refInput(), { target: { value: '  abc123  ' } });
    fireEvent.click(confirmBtn());
    fireEvent.click(confirmBtn());
    fireEvent.keyDown(refInput(), { key: 'Enter' });
    expect(checkoutBill).toHaveBeenCalledTimes(1);
    const payload = checkoutBill.mock.calls[0][0];
    expect(payload.payments).toEqual([{ method: 'upi', amount: 500, reference: 'ABC123' }]);
    expect(payload.shopId).toBe('s1');
    release();
    await waitFor(() => expect(screen.getByText('Payment Successful')).toBeTruthy());
    expect(popup()).toBeNull();
    expect(base.onSuccess).toHaveBeenCalledTimes(1);
  });

  it('closing the popup completes nothing; Show QR reopens with a FRESH QR request', async () => {
    const { onClose } = setup({ initialMethod: 'upi' });
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(popup()).toBeNull();
    expect(checkoutBill).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Complete Payment', { selector: 'h2' })).toBeTruthy();   // back on payment selection
    expect(screen.getByRole('button', { name: 'Complete Payment' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Show QR' }));
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
    expect(requestUpiQr).toHaveBeenCalledTimes(2);
  });

  it('Escape closes only the popup, not the payment modal', async () => {
    const { onClose } = setup({ initialMethod: 'upi' });
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(popup()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Complete Payment' })).toBeTruthy();
  });

  it('selecting the UPI tile opens the popup; switching to Cash/Card still works, no QR requested', async () => {
    setup({ initialMethod: 'cash' });
    expect(popup()).toBeNull();
    expect(requestUpiQr).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'UPI' }));
    expect(popup()).toBeTruthy();
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cash' }));
    fireEvent.change(screen.getByLabelText('Cash Received'), { target: { value: '600' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete Payment' }));
    await waitFor(() => expect(checkoutBill).toHaveBeenCalledTimes(1));
    expect(checkoutBill.mock.calls[0][0].payments).toEqual([{ method: 'cash', amount: 500, cashReceived: 600, change: 100 }]);
  });

  it('Card flow is unchanged (optional reference, trimmed, not uppercased)', async () => {
    setup({ initialMethod: 'card' });
    fireEvent.change(screen.getByLabelText(/Card reference/), { target: { value: ' 1234 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete Payment' }));
    await waitFor(() => expect(checkoutBill).toHaveBeenCalledTimes(1));
    expect(checkoutBill.mock.calls[0][0].payments).toEqual([{ method: 'card', amount: 500, reference: '1234' }]);
  });
});

describe('UI states', () => {
  it('missing configuration: exact message, no QR, confirm disabled', async () => {
    requestUpiQr.mockRejectedValue({ kind: 'unknown', code: 'UPI_NOT_CONFIGURED', message: 'x' });
    setup({ initialMethod: 'upi' });
    await waitFor(() => expect(screen.getByText('UPI QR payment is not configured. Please contact your Admin.')).toBeTruthy());
    expect(screen.queryByRole('img', { name: 'UPI payment QR code' })).toBeNull();
    expect(confirmBtn().disabled).toBe(true);
  });

  it('generic backend error shows message + retry', async () => {
    requestUpiQr.mockRejectedValueOnce({ kind: 'server', message: 'Server error. Please try again.' });
    setup({ initialMethod: 'upi' });
    await waitFor(() => screen.getByText('Server error. Please try again.'));
    expect(confirmBtn().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
  });

  it('QR whose amount differs from the request is rejected, never rendered', async () => {
    requestUpiQr.mockResolvedValue(qrFor('400.00'));
    setup({ initialMethod: 'upi' });
    await waitFor(() => screen.getByText(/QR amount does not match/));
    expect(screen.queryByRole('img', { name: 'UPI payment QR code' })).toBeNull();
  });

  it('zero / invalid payable amount: no QR request is ever made', async () => {
    setup({ initialMethod: 'upi', totals: { ...base.totals, grandTotal: 0 } });
    expect(screen.getByText(/Enter a valid payable amount/)).toBeTruthy();
    expect(requestUpiQr).not.toHaveBeenCalled();
    expect(confirmBtn().disabled).toBe(true);
  });

  it('duplicate reference: backend error shown under the field, popup stays, nothing completed, retry uses a fresh idempotency key', async () => {
    setup({ initialMethod: 'upi' });
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
    checkoutBill.mockRejectedValueOnce({
      kind: 'unknown', code: 'DUPLICATE_UPI_REFERENCE', message: 'This reference was already used.',
      raw: { status: 409, data: { reference: 'ABC123' } },
    });
    fireEvent.change(refInput(), { target: { value: 'abc123' } });
    fireEvent.click(confirmBtn());
    await waitFor(() => screen.getByText('This reference was already used.'));
    expect(popup()).toBeTruthy();
    expect(screen.queryByText('Payment Successful')).toBeNull();
    const firstKey = checkoutBill.mock.calls[0][0].idempotencyKey;
    fireEvent.change(refInput(), { target: { value: 'xyz789' } });
    expect(screen.queryByText('This reference was already used.')).toBeNull();   // edit clears stale error
    fireEvent.click(confirmBtn());
    await waitFor(() => screen.getByText('Payment Successful'));
    expect(checkoutBill).toHaveBeenCalledTimes(2);
    expect(checkoutBill.mock.calls[1][0].idempotencyKey).not.toBe(firstKey);
    expect(checkoutBill.mock.calls[1][0].payments[0].reference).toBe('XYZ789');
  });

  it('network error keeps the SAME idempotency key on retry (outcome unknown)', async () => {
    setup({ initialMethod: 'upi' });
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
    checkoutBill.mockRejectedValueOnce({ kind: 'network', message: 'Network error. Check your connection and try again.' });
    fireEvent.change(refInput(), { target: { value: 'abc123' } });
    fireEvent.click(confirmBtn());
    await waitFor(() => screen.getByText('Network error. Check your connection and try again.'));
    expect(popup()).toBeTruthy();
    fireEvent.click(confirmBtn());
    await waitFor(() => screen.getByText('Payment Successful'));
    expect(checkoutBill.mock.calls[1][0].idempotencyKey).toBe(checkoutBill.mock.calls[0][0].idempotencyKey);
  });
});

describe('split mode', () => {
  async function addLine(method, amount) {
    fireEvent.click(screen.getByRole('button', { name: /Add Payment/ }));
    const methods = screen.getAllByLabelText('Payment method');
    const amounts = screen.getAllByLabelText('Payment amount');
    const i = methods.length - 1;
    fireEvent.change(methods[i], { target: { value: method } });
    fireEvent.change(amounts[i], { target: { value: String(amount) } });
  }

  it('QR covers ONLY the UPI portion (₹300 of ₹500); nothing completes until Complete Payment', async () => {
    setup({ initialMethod: 'cash' });
    fireEvent.click(screen.getByRole('button', { name: /Split Payment/ }));
    await addLine('cash', 200);
    await addLine('upi', 300);
    expect(popup()).toBeNull();                                      // split is button-only
    fireEvent.click(screen.getByRole('button', { name: 'Show QR' }));
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
    expect(requestUpiQr).toHaveBeenCalledTimes(1);
    expect(requestUpiQr.mock.calls[0][0].amount).toBe('300.00');
    fireEvent.change(refInput(), { target: { value: 'upi99887766' } });
    fireEvent.click(confirmBtn());
    expect(popup()).toBeNull();
    expect(checkoutBill).not.toHaveBeenCalled();                     // confirm only attaches the reference
    expect(screen.getByText('Reference: UPI99887766')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Complete Payment' }));
    await waitFor(() => expect(checkoutBill).toHaveBeenCalledTimes(1));
    expect(checkoutBill.mock.calls[0][0].payments).toEqual([
      { method: 'cash', amount: 200 },
      { method: 'upi', amount: 300, reference: 'UPI99887766' },
    ]);
  });

  it('Show QR is disabled for zero/empty/3-decimal UPI amounts; never requests a QR', async () => {
    setup({ initialMethod: 'cash' });
    fireEvent.click(screen.getByRole('button', { name: /Split Payment/ }));
    await addLine('upi', 0);
    const btn = screen.getByRole('button', { name: 'Show QR' });
    expect(btn.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Payment amount'), { target: { value: '100.123' } });
    expect(btn.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Payment amount'), { target: { value: '' } });
    expect(btn.disabled).toBe(true);
    expect(requestUpiQr).not.toHaveBeenCalled();
  });

  it('changing the UPI amount invalidates the confirmed reference (stale QR never reused)', async () => {
    setup({ initialMethod: 'cash' });
    fireEvent.click(screen.getByRole('button', { name: /Split Payment/ }));
    await addLine('upi', 500);
    fireEvent.click(screen.getByRole('button', { name: 'Show QR' }));
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
    fireEvent.change(refInput(), { target: { value: 'abc123' } });
    fireEvent.click(confirmBtn());
    expect(screen.getByText('Reference: ABC123')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Payment amount'), { target: { value: '300' } });
    expect(screen.getByText('UPI reference not confirmed')).toBeTruthy();
    expect(screen.getByText('Split payments must add up to the bill total.')).toBeTruthy();   // existing check wins
    expect(screen.getByRole('button', { name: 'Complete Payment' }).disabled).toBe(true);
  });

  it('same reference on two UPI lines is blocked', async () => {
    setup({ initialMethod: 'cash' });
    fireEvent.click(screen.getByRole('button', { name: /Split Payment/ }));
    await addLine('upi', 250);
    await addLine('upi', 250);
    const showBtns = screen.getAllByRole('button', { name: 'Show QR' });
    fireEvent.click(showBtns[0]);
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
    fireEvent.change(refInput(), { target: { value: 'dup123' } });
    fireEvent.click(confirmBtn());
    fireEvent.click(screen.getAllByRole('button', { name: 'Show QR' })[1]);
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
    fireEvent.change(refInput(), { target: { value: 'DUP123' } });
    expect(confirmBtn().disabled).toBe(true);
    fireEvent.blur(refInput());
    expect(screen.getByText(/already used on another payment/)).toBeTruthy();
  });

  it('split without UPI behaves exactly as before (cash + card, no QR)', async () => {
    setup({ initialMethod: 'cash' });
    fireEvent.click(screen.getByRole('button', { name: /Split Payment/ }));
    await addLine('cash', 200);
    await addLine('card', 300);
    fireEvent.change(screen.getByPlaceholderText('Card reference (optional)'), { target: { value: ' c-77 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete Payment' }));
    await waitFor(() => expect(checkoutBill).toHaveBeenCalledTimes(1));
    expect(checkoutBill.mock.calls[0][0].payments).toEqual([
      { method: 'cash', amount: 200 },
      { method: 'card', amount: 300, reference: 'c-77' },
    ]);
    expect(requestUpiQr).not.toHaveBeenCalled();
  });

  it('split with an unconfirmed UPI reference cannot be completed', async () => {
    setup({ initialMethod: 'cash' });
    fireEvent.click(screen.getByRole('button', { name: /Split Payment/ }));
    await addLine('cash', 200);
    await addLine('upi', 300);
    expect(screen.getByRole('button', { name: 'Complete Payment' }).disabled).toBe(true);
    expect(screen.getByText('Show the QR and confirm the reference for each UPI payment.')).toBeTruthy();
    expect(checkoutBill).not.toHaveBeenCalled();
  });

  it('backend duplicate on a split line: banner shown, only that line\'s reference cleared, nothing completed', async () => {
    setup({ initialMethod: 'cash' });
    fireEvent.click(screen.getByRole('button', { name: /Split Payment/ }));
    await addLine('cash', 200);
    await addLine('upi', 300);
    fireEvent.click(screen.getByRole('button', { name: 'Show QR' }));
    await waitFor(() => screen.getByRole('img', { name: 'UPI payment QR code' }));
    fireEvent.change(refInput(), { target: { value: 'dupe555' } });
    fireEvent.click(confirmBtn());
    checkoutBill.mockRejectedValueOnce({
      kind: 'unknown', code: 'DUPLICATE_UPI_REFERENCE', message: 'This reference was already used.',
      raw: { status: 409, data: { reference: 'DUPE555' } },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete Payment' }));
    await waitFor(() => screen.getByText('This reference was already used.'));
    expect(screen.getByText('UPI reference not confirmed')).toBeTruthy();
    expect(screen.queryByText('Payment Successful')).toBeNull();
    expect(screen.getByRole('button', { name: 'Complete Payment' }).disabled).toBe(true);
  });
});
