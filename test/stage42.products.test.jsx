// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { searchProducts, getCategories } from '@/api/products';
import { InventoryPage } from '@/pages/cashier/InventoryPage';
import { BillingPage } from '@/pages/cashier/BillingPage';
import { ToastProvider } from '@/components/ui/Toast';
import { formatCurrency } from '@/utils/currency';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

const p = (over = {}) => ({ id: 'p1', name: 'Eggs Tray', sku: 'EGG-1', barcode: '8901', category: 'Eggs', price: 132.5, unit: 'tray', stock: 12, ...over });

// Routes GET calls by URL so categories never interfere with product assertions.
function mockGet({ products, categories = [] }) {
  return vi.spyOn(apiClient, 'get').mockImplementation((url, config) => {
    if (url === '/products/categories') return Promise.resolve({ data: categories });
    return typeof products === 'function' ? products(config?.params) : Promise.resolve({ data: products });
  });
}

describe('Stage 4.2 — API layer', () => {
  it('sends only query/category/barcode and never a branch or shop id', async () => {
    const get = mockGet({ products: [p()] });
    await searchProducts({ query: 'egg', category: 'Eggs' });
    await searchProducts({ barcode: '8901' });
    await searchProducts({});
    const calls = get.mock.calls.filter((c) => c[0] === '/products');
    expect(calls).toHaveLength(3);
    for (const [, config] of calls) {
      expect(Object.keys(config.params ?? {}).every((k) => ['query', 'category', 'barcode'].includes(k))).toBe(true);
    }
    expect(JSON.stringify(calls)).not.toMatch(/shopId|branchId|branch/i);
  });

  it('returns the backend payload untouched (no filtering, no price/stock rewriting)', async () => {
    const rows = [p({ id: 'a', stock: 0 }), p({ id: 'b', price: 99.99, unit: 'kg', stock: 3 })];
    mockGet({ products: rows });
    const res = await searchProducts({});
    expect(res).toEqual(rows);
  });

  it.each([[null], [undefined], [{ error: 'x' }], ['<html>']])('rejects a malformed products body (%o)', async (body) => {
    mockGet({ products: body === undefined ? undefined : body });
    await expect(searchProducts({})).rejects.toMatchObject({ message: expect.stringMatching(/Unexpected response/) });
  });

  it('rejects a malformed categories body', async () => {
    mockGet({ products: [], categories: { nope: true } });
    await expect(getCategories()).rejects.toMatchObject({ message: expect.stringMatching(/Unexpected response/) });
  });
});

describe('Stage 4.2 — Inventory page', () => {
  it('shows exactly the backend values, including a zero-stock assigned product', async () => {
    mockGet({ products: [p({ id: 'a', name: 'Eggs Tray', stock: 12, price: 132.5 }), p({ id: 'b', name: 'Duck Eggs', stock: 0, price: 18, unit: 'piece', sku: 'DUCK' })] });
    render(<InventoryPage />);
    const row = (await screen.findByText('Duck Eggs')).closest('tr');
    expect(within(row).getByText('0')).toBeTruthy();
    expect(within(row).getByText('piece')).toBeTruthy();
    expect(within(row).getByText(formatCurrency(18))).toBeTruthy();
    expect(within(row).getByText(/out of stock/i)).toBeTruthy();
    const first = screen.getByText('Eggs Tray').closest('tr');
    expect(within(first).getByText('12')).toBeTruthy();
    expect(within(first).getByText(formatCurrency(132.5))).toBeTruthy();
  });

  it('ignores a slow, older response that arrives after a newer one', async () => {
    const slow = deferred();
    const fast = deferred();
    mockGet({
      products: (params) => (params?.query === 'egg' ? fast.promise : slow.promise),
    });
    const user = userEvent.setup();
    render(<InventoryPage />);
    await user.type(screen.getByLabelText('Search products'), 'egg');
    await waitFor(() => expect(apiClient.get.mock.calls.some((c) => c[1]?.params?.query === 'egg')).toBe(true));

    fast.resolve({ data: [p({ id: 'n', name: 'Newest Result', stock: 4 })] });
    expect(await screen.findByText('Newest Result')).toBeTruthy();

    slow.resolve({ data: [p({ id: 'o', name: 'Stale Result', stock: 99 })] });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Stale Result')).toBeNull();
    expect(screen.getByText('Newest Result')).toBeTruthy();
  });

  it('shows the error state instead of crashing on a malformed body', async () => {
    mockGet({ products: { not: 'an array' } });
    render(<InventoryPage />);
    expect(await screen.findByText(/Unexpected response from the server/)).toBeTruthy();
  });
});

describe('Stage 4.2 — Billing page', () => {
  const renderBilling = () =>
    render(
      <MemoryRouter>
        <ToastProvider>
          <BillingPage />
        </ToastProvider>
      </MemoryRouter>
    );

  it('keeps an assigned zero-stock product visible but unselectable, and shows backend price/unit', async () => {
    mockGet({ products: [p({ id: 'a', name: 'Eggs Tray', stock: 12, price: 132.5 }), p({ id: 'b', name: 'Duck Eggs', stock: 0, price: 18, unit: 'piece' })] });
    const user = userEvent.setup();
    renderBilling();
    const duck = (await screen.findByText('Duck Eggs')).closest('[role="button"]');
    expect(within(duck).getByText(/out of stock/i)).toBeTruthy();
    expect(within(duck).getByText(formatCurrency(18))).toBeTruthy();
    expect(within(duck).getByText(/piece/)).toBeTruthy();
    await user.click(duck);
    expect(screen.queryByText('Add Item')).toBeNull();

    const eggs = screen.getByText('Eggs Tray').closest('[role="button"]');
    expect(within(eggs).getByText(formatCurrency(132.5))).toBeTruthy();
    await user.click(eggs);
    expect(await screen.findByText('Add Item')).toBeTruthy();
  });

  it('ignores a slow, older response that arrives after a newer one', async () => {
    const slow = deferred();
    const fast = deferred();
    mockGet({ products: (params) => (params?.query === 'egg' ? fast.promise : slow.promise) });
    const user = userEvent.setup();
    renderBilling();
    await user.type(screen.getByLabelText('Search products'), 'egg');
    await waitFor(() => expect(apiClient.get.mock.calls.some((c) => c[1]?.params?.query === 'egg')).toBe(true));

    fast.resolve({ data: [p({ id: 'n', name: 'Newest Result' })] });
    expect(await screen.findByText('Newest Result')).toBeTruthy();

    slow.resolve({ data: [p({ id: 'o', name: 'Stale Result' })] });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Stale Result')).toBeNull();
  });

  it('shows the error state with a working retry on a malformed body', async () => {
    let bad = true;
    mockGet({ products: () => Promise.resolve({ data: bad ? { oops: 1 } : [p({ name: 'Recovered' })] }) });
    const user = userEvent.setup();
    renderBilling();
    expect(await screen.findByText(/Unexpected response from the server/)).toBeTruthy();
    bad = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Recovered')).toBeTruthy();
  });
});
