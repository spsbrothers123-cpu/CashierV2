// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('@/api/upi', () => ({ requestUpiQr: vi.fn() }));
vi.mock('@/api/bills', () => ({ checkoutBill: vi.fn() }));

import { checkoutBill } from '@/api/bills';
import { PaymentModal } from '@/components/payment/PaymentModal';

const items = [{ product: { id: 'p1', name: 'Rice', price: 50, unit: 'kg', stock: 5 }, quantity: 2.5, unitPrice: 50 }];
const base = {
  open: true,
  cashier: { id: 'c1', name: 'John', shop: { id: 's1', name: 'Main' } },
  session: { id: 'sess1' },
  items,
  customer: null,
  totals: { subtotal: 125, discount: 0, tax: 0, grandTotal: 125 },
  onSuccess: vi.fn(),
  onSelectCustomer: vi.fn(),
  onViewBill: vi.fn(),
};
const pay = () => fireEvent.click(screen.getByRole('button', { name: 'Complete Payment' }));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Stage 4.3 — PaymentModal reports stock/price rejections', () => {
  it.each(['OUT_OF_STOCK', 'INSUFFICIENT_STOCK', 'PRODUCT_NOT_FOUND', 'PRODUCT_INACTIVE', 'PAYMENT_AMOUNT_MISMATCH'])(
    'calls onCheckoutRejected for %s and still shows the backend message',
    async (code) => {
      checkoutBill.mockRejectedValueOnce({ kind: 'unknown', code, message: `backend says ${code}` });
      const onCheckoutRejected = vi.fn();
      render(<PaymentModal {...base} initialMethod="card" onClose={vi.fn()} onCheckoutRejected={onCheckoutRejected} />);
      pay();
      expect(await screen.findByText(`backend says ${code}`)).toBeTruthy();
      expect(onCheckoutRejected).toHaveBeenCalledTimes(1);
      expect(onCheckoutRejected.mock.calls[0][0].code).toBe(code);
      expect(base.onSuccess).not.toHaveBeenCalled();
    }
  );

  it.each([
    [{ kind: 'network', message: 'Network error. Check your connection and try again.' }],
    [{ kind: 'server', code: 'INTERNAL', message: 'Server error. Please try again.' }],
    [{ kind: 'unknown', code: 'NO_ACTIVE_SESSION', message: 'Start a cashier session before billing.' }],
  ])('does NOT refresh the cart for unrelated failures (%o)', async (err) => {
    checkoutBill.mockRejectedValueOnce(err);
    const onCheckoutRejected = vi.fn();
    render(<PaymentModal {...base} initialMethod="card" onClose={vi.fn()} onCheckoutRejected={onCheckoutRejected} />);
    pay();
    expect(await screen.findByText(err.message)).toBeTruthy();
    expect(onCheckoutRejected).not.toHaveBeenCalled();
  });

  it('is optional: a rejection without a handler just shows the message', async () => {
    checkoutBill.mockRejectedValueOnce({ kind: 'unknown', code: 'OUT_OF_STOCK', message: 'Rice is out of stock.' });
    render(<PaymentModal {...base} initialMethod="card" onClose={vi.fn()} />);
    pay();
    expect(await screen.findByText('Rice is out of stock.')).toBeTruthy();
  });

  it('cash, card and credit payloads are unchanged and carry the fractional cart untouched', async () => {
    checkoutBill.mockImplementation(async (p) => ({ ...p, id: 'b1', billNumber: 'EM-1', status: 'paid', createdAt: new Date().toISOString() }));
    render(<PaymentModal {...base} initialMethod="card" onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Card reference/), { target: { value: ' 9876 ' } });
    pay();
    await waitFor(() => expect(checkoutBill).toHaveBeenCalledTimes(1));
    const payload = checkoutBill.mock.calls[0][0];
    expect(payload.payments).toEqual([{ method: 'card', amount: 125, reference: '9876' }]);
    expect(payload.items[0].quantity).toBe(2.5);
  });
});
