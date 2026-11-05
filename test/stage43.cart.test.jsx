// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { useCartStore } from '@/store/cartStore';
import { checkoutBill, holdBill } from '@/api/bills';
import { describeCartChanges } from '@/utils/cartReconcile';
import { ProductEditModal } from '@/components/pos/ProductEditModal';
import { BillingPage } from '@/pages/cashier/BillingPage';
import { ToastProvider } from '@/components/ui/Toast';

// A stand-in for the payment sheet: the real one is covered in stage43.paymentmodal.test.jsx.
vi.mock('@/components/payment/PaymentModal', () => ({
  PaymentModal: ({ open, onCheckoutRejected }) =>
    open ? (
      <div role="dialog" aria-label="Payment sheet">
        <button onClick={() => onCheckoutRejected({ code: 'INSUFFICIENT_STOCK' })}>simulate rejection</button>
      </div>
    ) : null,
}));

const rice = (over = {}) => ({ id: 'rice', name: 'Rice', price: 50, unit: 'kg', stock: 5, category: 'Grocery', ...over });
const eggs = (over = {}) => ({ id: 'eggs', name: 'Eggs Tray', price: 132, unit: 'tray', stock: 3, category: 'Eggs', ...over });

beforeEach(() => useCartStore.setState({ items: [], customer: null }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useCartStore.setState({ items: [], customer: null });
});

describe('cart store — stock rules, fractional quantities, no price override', () => {
  it('blocks zero-stock products and quantities above stock', () => {
    const s = useCartStore.getState();
    expect(s.addProduct(eggs({ stock: 0 }))).toBe(false);
    expect(s.upsertCartItem(eggs({ stock: 0 }), { quantity: 1 })).toBe(false);
    expect(s.upsertCartItem(eggs({ stock: 3 }), { quantity: 4 })).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(s.addProduct(eggs({ stock: 1 }))).toBe(true);
    expect(useCartStore.getState().addProduct(eggs({ stock: 1 }))).toBe(false);
  });

  it('keeps 1.5 kg and 2.5 kg exactly as entered (no rounding), and caps at stock', () => {
    const { upsertCartItem } = useCartStore.getState();
    expect(upsertCartItem(rice({ stock: 3 }), { quantity: 1.5 })).toBe(true);
    expect(useCartStore.getState().items[0].quantity).toBe(1.5);
    expect(upsertCartItem(rice({ stock: 3 }), { quantity: 2.5 })).toBe(true);
    expect(useCartStore.getState().items[0].quantity).toBe(2.5);
    expect(upsertCartItem(rice({ stock: 3 }), { quantity: 3.5 })).toBe(false);
    expect(useCartStore.getState().items[0].quantity).toBe(2.5);
    expect(useCartStore.getState().totals().subtotal).toBe(125);
  });

  it('the line price is always the backend price; a client price is ignored', () => {
    useCartStore.getState().upsertCartItem(rice({ price: 50 }), { quantity: 2, unitPrice: 1 });
    expect(useCartStore.getState().items[0].unitPrice).toBe(50);
  });

  it('reconcile removes unavailable lines, clamps over-stock, refreshes price, preserves fractions', () => {
    const s = useCartStore.getState();
    s.upsertCartItem(rice({ stock: 5 }), { quantity: 2.5 });
    s.upsertCartItem(eggs({ stock: 3 }), { quantity: 3 });
    s.upsertCartItem({ id: 'gone', name: 'Gone Item', price: 9, unit: 'piece', stock: 4 }, { quantity: 1 });
    s.upsertCartItem({ id: 'zero', name: 'Zero Item', price: 9, unit: 'piece', stock: 4 }, { quantity: 1 });

    const changes = useCartStore.getState().reconcileWithCatalogue([
      rice({ stock: 2, price: 55 }), // over-stock + repriced
      eggs({ stock: 3 }), // unchanged
      { id: 'zero', name: 'Zero Item', price: 9, unit: 'piece', stock: 0 },
    ]);
    const items = useCartStore.getState().items;
    expect(items.map((i) => i.product.id)).toEqual(['rice', 'eggs']);
    expect(items[0]).toMatchObject({ quantity: 2, unitPrice: 55 });
    expect(items[0].product.stock).toBe(2);
    expect(items[1]).toMatchObject({ quantity: 3, unitPrice: 132 });
    expect(changes.map((c) => c.type).sort()).toEqual(['reduced', 'removed', 'removed', 'repriced']);
    expect(describeCartChanges(changes)).toMatch(/Rice reduced to 2 kg/);
    expect(describeCartChanges(changes)).toMatch(/Rice price changed ₹50 → ₹55/);
    expect(describeCartChanges(changes)).toMatch(/Gone Item removed/);
  });

  it('reconcile keeps a fractional quantity that is still within stock, untouched', () => {
    useCartStore.getState().upsertCartItem(rice({ stock: 5 }), { quantity: 2.5 });
    const changes = useCartStore.getState().reconcileWithCatalogue([rice({ stock: 4 })]);
    expect(changes).toEqual([]);
    expect(useCartStore.getState().items[0].quantity).toBe(2.5);
  });
});

describe('wire payloads — fractional quantities are sent exactly; never a price', () => {
  // BACKEND BLOCKER (documented, not fixed here): backendV2 stores quantity as an integer and
  // rejects non-whole quantities, so these payloads currently cannot succeed end to end.
  it('checkout and hold send 1.5 and 2.5 unchanged with no unitPrice', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'b1' } });
    const items = [
      { product: rice(), quantity: 1.5, unitPrice: 1 },
      { product: rice({ id: 'rice2' }), quantity: 2.5, unitPrice: 1 },
    ];
    await checkoutBill({ customer: null, items, payments: [{ method: 'cash', amount: 200 }], idempotencyKey: 'k' });
    await holdBill({ label: 'x', customer: null, items });
    for (const [, body] of post.mock.calls) {
      expect(body.items).toEqual([
        { product: { id: 'rice' }, quantity: 1.5 },
        { product: { id: 'rice2' }, quantity: 2.5 },
      ]);
    }
  });
});

describe('ProductEditModal — fractional quantities stay supported', () => {
  const open = (product) => {
    const onConfirm = vi.fn();
    render(<ProductEditModal open product={product} existingItem={null} onConfirm={onConfirm} onCancel={vi.fn()} />);
    return onConfirm;
  };

  it.each([['1.5'], ['2.5']])('accepts %s kg and confirms it unrounded', async (qty) => {
    const onConfirm = open(rice({ stock: 3 }));
    const input = screen.getByLabelText(/Quantity/);
    fireEvent.change(input, { target: { value: qty } });
    fireEvent.click(screen.getByRole('button', { name: /Add to Cart/i }));
    expect(onConfirm).toHaveBeenCalledWith({ quantity: Number(qty) });
  });

  it('rejects a fractional quantity for a whole-count unit with the existing message', () => {
    const onConfirm = open(eggs({ stock: 3 }));
    const input = screen.getByLabelText(/Quantity/);
    fireEvent.change(input, { target: { value: '1.5' } });
    fireEvent.blur(input); // the modal shows its message once the field has been touched
    expect(screen.getByText(/can't be sold in fractional quantities/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add to Cart/i }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows the stock error above the available quantity', () => {
    open(rice({ stock: 2 }));
    const input = screen.getByLabelText(/Quantity/);
    fireEvent.change(input, { target: { value: '2.5' } });
    fireEvent.blur(input);
    expect(screen.getByText(/Only 2 kg\(s\) available at this branch/)).toBeTruthy();
  });
});

describe('BillingPage — reconciles the cart after a rejected checkout', () => {
  const mockCatalogue = (getRows) =>
    vi.spyOn(apiClient, 'get').mockImplementation((url) => {
      if (url === '/products/categories') return Promise.resolve({ data: [] });
      return getRows();
    });
  const renderBilling = () =>
    render(
      <MemoryRouter>
        <ToastProvider>
          <BillingPage />
        </ToastProvider>
      </MemoryRouter>
    );
  const seedCart = () => {
    const s = useCartStore.getState();
    s.upsertCartItem(rice({ stock: 5 }), { quantity: 2.5 });
    s.upsertCartItem(eggs({ stock: 3 }), { quantity: 3 });
  };
  const openPaymentAndReject = async (user) => {
    await user.click(await screen.findByRole('button', { name: 'Complete Payment' }));
    await user.click(await screen.findByRole('button', { name: 'simulate rejection' }));
  };

  it('stock moved: refreshes the catalogue, clamps the line, tells the cashier, closes the payment sheet', async () => {
    let calls = 0;
    const get = mockCatalogue(() => {
      calls += 1;
      return Promise.resolve({ data: calls <= 1 ? [rice({ stock: 5 }), eggs()] : [rice({ stock: 2, price: 55 }), eggs()] });
    });
    seedCart();
    const user = userEvent.setup();
    renderBilling();
    await screen.findByText('Rice');
    await openPaymentAndReject(user);

    expect(await screen.findByText(/Cart updated:/)).toBeTruthy();
    expect(screen.getByText(/Rice reduced to 2 kg/)).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Payment sheet' })).toBeNull();
    const line = useCartStore.getState().items.find((i) => i.product.id === 'rice');
    expect(line).toMatchObject({ quantity: 2, unitPrice: 55 });
    expect(useCartStore.getState().items).toHaveLength(2); // never cleared wholesale
    expect(get.mock.calls.filter((c) => c[0] === '/products').length).toBeGreaterThanOrEqual(3); // initial + reconcile + grid refresh
  });

  it('nothing actually changed: the payment sheet stays open and no toast is shown', async () => {
    mockCatalogue(() => Promise.resolve({ data: [rice({ stock: 5 }), eggs()] }));
    seedCart();
    const user = userEvent.setup();
    renderBilling();
    await screen.findByText('Rice');
    await openPaymentAndReject(user);
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Payment sheet' })).toBeTruthy());
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/Cart updated:/)).toBeNull();
    expect(useCartStore.getState().items.find((i) => i.product.id === 'rice').quantity).toBe(2.5);
  });

  it('live catalogue unavailable: cart untouched and the payment sheet stays open', async () => {
    let n = 0;
    mockCatalogue(() => {
      n += 1;
      return n === 1 ? Promise.resolve({ data: [rice({ stock: 5 }), eggs()] }) : Promise.reject({ kind: 'network', message: 'Network error.' });
    });
    seedCart();
    const user = userEvent.setup();
    renderBilling();
    await screen.findByText('Rice');
    await openPaymentAndReject(user);
    await new Promise((r) => setTimeout(r, 80));
    expect(screen.getByRole('dialog', { name: 'Payment sheet' })).toBeTruthy();
    expect(useCartStore.getState().items.map((i) => i.quantity)).toEqual([2.5, 3]);
  });
});
