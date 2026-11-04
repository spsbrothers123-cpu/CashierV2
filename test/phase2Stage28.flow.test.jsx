// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { SignupPage } from '@/pages/cashier/SignupPage';
import { ProductEditModal } from '@/components/pos/ProductEditModal';
import { BillDetails } from '@/components/bills/BillDetails';
import { useCartStore } from '@/store/cartStore';
import { useSignupStore } from '@/store/signupStore';
import { checkoutBill, holdBill, getBillHistory } from '@/api/bills';

const egg = (over = {}) => ({ id: 'p1', name: 'Eggs', price: 120, unit: 'tray', stock: 3, ...over });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useCartStore.setState({ items: [], customer: null });
});

describe('Cashier signup — branch is SELECTED, never typed', () => {
  beforeEach(() => {
    useSignupStore.setState({ invitationVerified: true, verificationToken: 'tok', shopId: '' });
  });

  it('loads branches from the backend, disables taken ones and posts shopId (no branchName)', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: [
        { id: 's1', name: 'Branch One', location: 'One', available: true },
        { id: 's2', name: 'Branch Two', location: 'Two', available: false },
      ],
    });
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { requestId: 'r1', email: 'a@b.co' } });
    const user = userEvent.setup();
    render(<MemoryRouter><SignupPage /></MemoryRouter>);

    await waitFor(() => expect(get).toHaveBeenCalledWith('/auth/branches'));
    expect(screen.queryByPlaceholderText(/Bengaluru/i)).toBeNull(); // no free-text branch box
    const taken = await screen.findByRole('option', { name: /Branch Two/ });
    expect(taken.disabled).toBe(true);

    await user.type(screen.getByLabelText(/Full name/i), 'Asha');
    await user.type(screen.getByLabelText(/^Email/i), 'asha@x.co');
    await user.selectOptions(screen.getByLabelText(/^Branch/i), 's1');
    await user.type(screen.getByLabelText(/^Password/i), 'Str0ng!Passw0rd#1');
    await user.type(screen.getByLabelText(/Confirm password/i), 'Str0ng!Passw0rd#1');
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/auth/signup');
    expect(body.shopId).toBe('s1');
    expect(body).not.toHaveProperty('branchName');
  });

  it('blocks submit without a branch', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ id: 's1', name: 'Branch One', location: 'One', available: true }] });
    const post = vi.spyOn(apiClient, 'post');
    const user = userEvent.setup();
    render(<MemoryRouter><SignupPage /></MemoryRouter>);
    await screen.findByRole('option', { name: /Branch One/ });
    await user.click(screen.getByRole('button', { name: /Create Account/i }));
    expect(await screen.findByText('Please select your branch.')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('Checkout / hold never send a client price', () => {
  it('checkout body carries only product ids, quantities, payments', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'b1' } });
    await checkoutBill({
      customer: { id: 'c1', name: 'X', creditBalance: 5 },
      items: [{ product: egg(), quantity: 2, unitPrice: 1 }], // a tampered/stale unitPrice
      payments: [{ method: 'cash', amount: 240 }],
      idempotencyKey: 'k1',
      subtotal: 1, grandTotal: 1,
    });
    const [, body] = post.mock.calls[0];
    expect(body.items).toEqual([{ product: { id: 'p1' }, quantity: 2 }]);
    expect(JSON.stringify(body)).not.toMatch(/unitPrice|price/i);
    expect(body.customer).toEqual({ id: 'c1' });
  });

  it('hold body is priceless too', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
    await holdBill({ label: 'L', customer: null, items: [{ product: egg(), quantity: 1, unitPrice: 9 }], amount: 9 });
    const [, body] = post.mock.calls[0];
    expect(JSON.stringify(body)).not.toMatch(/unitPrice|price|amount/i);
  });

  it('history asks for cancelled bills so they stay visible', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await getBillHistory({ query: 'x' });
    expect(get.mock.calls[0][1].params.includeCancelled).toBe('true');
  });
});

describe('Cart enforces branch stock', () => {
  it('blocks zero-stock products', () => {
    expect(useCartStore.getState().addProduct(egg({ stock: 0 }))).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('never exceeds available stock via add, upsert or updateQuantity', () => {
    const s = () => useCartStore.getState();
    expect(s().addProduct(egg())).toBe(true);
    expect(s().addProduct(egg())).toBe(true);
    expect(s().addProduct(egg())).toBe(true);
    expect(s().addProduct(egg())).toBe(false); // 4th unit of 3
    expect(s().items[0].quantity).toBe(3);
    expect(s().upsertCartItem(egg(), { quantity: 4 })).toBe(false);
    s().updateQuantity('p1', 99);
    expect(s().items[0].quantity).toBe(3);
  });

  it('cart price is always the backend price (no override)', () => {
    useCartStore.getState().upsertCartItem(egg({ price: 95 }), { quantity: 1, unitPrice: 1 });
    const line = useCartStore.getState().items[0];
    expect(line.unitPrice).toBe(95);
    expect(useCartStore.getState().totals().grandTotal).toBe(95);
  });
});

describe('ProductEditModal — no price override', () => {
  it('has no editable price field, rejects over-stock, confirms quantity only', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ProductEditModal open product={egg()} existingItem={null} onConfirm={onConfirm} onCancel={() => {}} />);
    expect(screen.queryByLabelText(/Selling Price/i)).toBeNull();
    expect(screen.getByText(/3 available/i)).toBeTruthy();

    const qty = document.getElementById('edit-qty');
    await user.clear(qty);
    await user.type(qty, '5');
    await user.tab(); // errors show once the field is touched (existing modal behaviour)
    expect((await screen.findByText(/Only 3 tray\(s\) available/i))).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add to Cart/i }).disabled).toBe(true);

    await user.clear(qty);
    await user.type(qty, '2');
    await user.click(screen.getByRole('button', { name: /Add to Cart/i }));
    expect(onConfirm).toHaveBeenCalledWith({ quantity: 2 });
  });
});

describe('Cancelled bills are clearly labelled', () => {
  const bill = (status) => ({
    id: 'b1', billNumber: 'B-1', createdAt: new Date().toISOString(), status,
    cancelledAt: new Date().toISOString(), cancelReason: 'Wrong customer',
    items: [{ product: egg(), quantity: 1, unitPrice: 120 }], payments: [{ method: 'cash', amount: 120 }],
    subtotal: 120, discount: 0, tax: 0, grandTotal: 120, customer: null,
  });

  it('shows the banner + reason and hides reprint for cancelled', () => {
    render(<BillDetails open onClose={() => {}} bill={bill('cancelled')} />);
    expect(screen.getByText(/was cancelled by the administrator/i)).toBeTruthy();
    expect(screen.getByText(/Wrong customer/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Reprint/i })).toBeNull();
  });

  it('paid bill: no banner, reprint available', () => {
    render(<BillDetails open onClose={() => {}} bill={bill('paid')} />);
    expect(screen.queryByText(/cancelled by the administrator/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Reprint/i })).toBeTruthy();
  });
});
