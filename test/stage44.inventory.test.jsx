// @vitest-environment jsdom
// Stage 4.4 — Cashier inventory display. All API traffic is MOCKED (apiClient
// is spied); nothing here talks to a real backend or database.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fs from 'node:fs';
import path from 'node:path';
import { apiClient } from '@/api/client';
import { InventoryPage } from '@/pages/cashier/InventoryPage';
import { ProductCard } from '@/components/pos/ProductCard';
import { ProductListItem } from '@/components/pos/ProductListItem';
import { useAuthStore } from '@/store/authStore';
import { getStockState, normalizeThreshold, STOCK_TONE } from '@/utils/stockStatus';

const p = (over = {}) => ({
  id: 'p1', name: 'Eggs Tray', sku: 'EGG-1', barcode: '8901', category: 'Eggs',
  price: 132.5, unit: 'tray', stock: 12, lowStockThreshold: 10, ...over,
});

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};

function mockGet(products) {
  return vi.spyOn(apiClient, 'get').mockImplementation((url, config) => {
    if (url === '/products/categories') return Promise.resolve({ data: [] });
    const v = typeof products === 'function' ? products(config?.params) : products;
    return v instanceof Promise ? v : Promise.resolve({ data: v });
  });
}
const productCalls = () => apiClient.get.mock.calls.filter((c) => c[0] === '/products');

let visibility = 'visible';
beforeEach(() => {
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  useAuthStore.setState({ cashier: null, status: 'unauthenticated' });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Stage 4.4 — stockStatus (single source of truth)', () => {
  it('out of stock at 0 and below, regardless of threshold', () => {
    expect(getStockState({ stock: 0, lowStockThreshold: 10 })).toBe('out');
    expect(getStockState({ stock: -2, lowStockThreshold: 10 })).toBe('out');
    expect(getStockState({ stock: 0 })).toBe('out');
  });

  it('low when stock <= threshold (boundary inclusive), in stock above it', () => {
    expect(getStockState({ stock: 9, lowStockThreshold: 10 })).toBe('low');
    expect(getStockState({ stock: 10, lowStockThreshold: 10 })).toBe('low');
    expect(getStockState({ stock: 11, lowStockThreshold: 10 })).toBe('in');
    expect(getStockState({ stock: 1, lowStockThreshold: 1 })).toBe('low');
  });

  it.each([[undefined], [null], [0], [-3], [NaN], ['abc'], ['']])(
    'threshold %o means no Low Stock warning — and there is no fallback to 5',
    (threshold) => {
      expect(normalizeThreshold(threshold)).toBe(0);
      expect(getStockState({ stock: 1, lowStockThreshold: threshold })).toBe('in');
      expect(getStockState({ stock: 5, lowStockThreshold: threshold })).toBe('in');
      expect(getStockState({ stock: 3, lowStockThreshold: threshold })).toBe('in');
    }
  );

  it('accepts a numeric-string threshold from the API', () => {
    expect(getStockState({ stock: 4, lowStockThreshold: '5' })).toBe('low');
  });

  it('maps every state to a tone', () => {
    expect(STOCK_TONE).toEqual({ out: 'danger', low: 'warning', in: 'success' });
  });

  it('no hardcoded low-stock number remains anywhere in src (excluding the stub)', () => {
    const offenders = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== 'stub') walk(full);
        } else if (/\.(jsx?|tsx?)$/.test(e.name) && /stock\s*<=\s*\d/.test(fs.readFileSync(full, 'utf8'))) {
          // `stock <= 0` is the out-of-stock rule in other files; only flag low-stock numbers.
          const src = fs.readFileSync(full, 'utf8');
          if (/stock\s*<=\s*[1-9]/.test(src)) offenders.push(full);
        }
      }
    };
    walk(path.resolve(import.meta.dirname, '../src'));
    expect(offenders).toEqual([]);
  });
});

describe('Stage 4.4 — Inventory page stock states', () => {
  it('uses each product threshold: low at the threshold, in stock above, out at zero, none when threshold is 0/missing', async () => {
    mockGet([
      p({ id: 'a', name: 'At Threshold', stock: 10, lowStockThreshold: 10 }),
      p({ id: 'b', name: 'Above Threshold', stock: 11, lowStockThreshold: 10 }),
      p({ id: 'c', name: 'Zero Stock', stock: 0, lowStockThreshold: 10 }),
      p({ id: 'd', name: 'No Threshold', stock: 2, lowStockThreshold: 0 }),
      p({ id: 'e', name: 'Missing Threshold', stock: 3, lowStockThreshold: undefined }),
    ]);
    render(<InventoryPage />);
    const badge = async (name) => (await screen.findByText(name)).closest('tr');
    expect(within(await badge('At Threshold')).getByText('Low Stock')).toBeTruthy();
    expect(within(await badge('Above Threshold')).getByText('In Stock')).toBeTruthy();
    expect(within(await badge('Zero Stock')).getByText('Out of Stock')).toBeTruthy();
    expect(within(await badge('No Threshold')).getByText('In Stock')).toBeTruthy();
    expect(within(await badge('Missing Threshold')).getByText('In Stock')).toBeTruthy();
  });

  it('keeps showing assigned zero-stock products and the backend stock/price/unit values', async () => {
    mockGet([p({ id: 'z', name: 'Duck Eggs', stock: 0, unit: 'piece', price: 18, lowStockThreshold: 0 })]);
    render(<InventoryPage />);
    const row = (await screen.findByText('Duck Eggs')).closest('tr');
    expect(within(row).getByText('0')).toBeTruthy();
    expect(within(row).getByText('piece')).toBeTruthy();
    expect(within(row).getByText('Out of Stock')).toBeTruthy();
  });
});

describe('Stage 4.4 — POS cards use the same rule', () => {
  const grid = (product) => (
    <>
      <ProductCard product={product} onSelect={() => {}} />
      <ProductListItem product={product} onSelect={() => {}} />
    </>
  );

  it('low stock only when stock <= threshold (shows "N left" on both)', () => {
    render(grid(p({ stock: 4, lowStockThreshold: 4 })));
    expect(screen.getAllByText('4 left')).toHaveLength(2);
  });

  it('no Low Stock for a small stock when the threshold is 0 or missing (the old ≤5 rule is gone)', () => {
    render(grid(p({ stock: 3, lowStockThreshold: 0 })));
    expect(screen.getAllByText('In stock')).toHaveLength(2);
    cleanup();
    render(grid(p({ stock: 5, lowStockThreshold: undefined })));
    expect(screen.getAllByText('In stock')).toHaveLength(2);
    expect(screen.queryByText(/left/)).toBeNull();
  });

  it('out of stock stays disabled and is never "low"', () => {
    render(grid(p({ stock: 0, lowStockThreshold: 10 })));
    expect(screen.getAllByText('Out of stock')).toHaveLength(2);
    expect(screen.queryByText(/left/)).toBeNull();
  });
});

describe('Stage 4.4 — manual refresh', () => {
  it('refetches with the current search/category and shows the new stock without a skeleton flash', async () => {
    let stock = 12;
    mockGet(() => [p({ stock })]);
    render(<InventoryPage />);
    const row = (await screen.findByText('Eggs Tray')).closest('tr');
    expect(within(row).getByText('12')).toBeTruthy();

    stock = 7;
    const next = deferred();
    apiClient.get.mockImplementation((url) => (url === '/products/categories' ? Promise.resolve({ data: [] }) : next.promise));
    const before = productCalls().length;
    await userEvent.setup().click(screen.getByRole('button', { name: /refresh/i }));
    expect(productCalls()).toHaveLength(before + 1);
    // List stays on screen while the refresh is in flight.
    expect(screen.getByText('Eggs Tray')).toBeTruthy();
    expect(screen.getByRole('button', { name: /refresh/i }).disabled).toBe(true);

    next.resolve({ data: [p({ stock: 7 })] });
    await waitFor(() => expect(within(screen.getByText('Eggs Tray').closest('tr')).getByText('7')).toBeTruthy());
    expect(screen.getByRole('button', { name: /refresh/i }).disabled).toBe(false);
  });

  it('a failed refresh keeps the last good list instead of replacing it with an error', async () => {
    mockGet([p({ stock: 12 })]);
    render(<InventoryPage />);
    await screen.findByText('Eggs Tray');
    apiClient.get.mockImplementation((url) =>
      url === '/products/categories' ? Promise.resolve({ data: [] }) : Promise.reject({ kind: 'network', message: 'Network error.' })
    );
    await userEvent.setup().click(screen.getByRole('button', { name: /refresh/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /refresh/i }).disabled).toBe(false));
    expect(screen.getByText('Eggs Tray')).toBeTruthy();
    expect(screen.queryByText('Network error.')).toBeNull();
  });

  it('an older refresh response never overwrites a newer search result', async () => {
    mockGet([p({ stock: 1 })]);
    render(<InventoryPage />);
    await screen.findByText('Eggs Tray');
    const olderRefresh = deferred();
    const newerSearch = deferred();
    apiClient.get.mockImplementation((url, config) => {
      if (url === '/products/categories') return Promise.resolve({ data: [] });
      return config?.params?.query === 'duck' ? newerSearch.promise : olderRefresh.promise;
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /refresh/i })); // older, still pending
    await user.type(screen.getByLabelText('Search products'), 'duck'); // newer request
    await waitFor(() => expect(productCalls().some((c) => c[1]?.params?.query === 'duck')).toBe(true));

    newerSearch.resolve({ data: [p({ id: 'd', name: 'Duck Eggs', stock: 4 })] });
    expect(await screen.findByText('Duck Eggs')).toBeTruthy();
    olderRefresh.resolve({ data: [p({ id: 'o', name: 'Stale Refresh', stock: 99 })] });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Stale Refresh')).toBeNull();
    expect(screen.getByText('Duck Eggs')).toBeTruthy();
  });
});

describe('Stage 4.4 — refresh on tab focus / visibility', () => {
  it('refetches when the window regains focus', async () => {
    mockGet([p()]);
    render(<InventoryPage />);
    await screen.findByText('Eggs Tray');
    const before = productCalls().length;
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(productCalls()).toHaveLength(before + 1));
  });

  it('refetches when the tab becomes visible, not when it becomes hidden', async () => {
    mockGet([p()]);
    render(<InventoryPage />);
    await screen.findByText('Eggs Tray');
    const before = productCalls().length;

    visibility = 'hidden';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(productCalls()).toHaveLength(before);

    visibility = 'visible';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(productCalls()).toHaveLength(before + 1));
  });

  it('does not stack requests: focus + visibilitychange together cause one fetch while one is in flight', async () => {
    mockGet([p()]);
    render(<InventoryPage />);
    await screen.findByText('Eggs Tray');
    const hold = deferred();
    apiClient.get.mockImplementation((url) => (url === '/products/categories' ? Promise.resolve({ data: [] }) : hold.promise));
    const before = productCalls().length;
    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    expect(productCalls()).toHaveLength(before + 1);
    hold.resolve({ data: [p()] });
    await waitFor(() => expect(screen.getByRole('button', { name: /refresh/i }).disabled).toBe(false));
  });

  it('uses the CURRENT search term when it refreshes on focus', async () => {
    mockGet((params) => (params?.query === 'duck' ? [p({ id: 'd', name: 'Duck Eggs' })] : [p()]));
    const user = userEvent.setup();
    render(<InventoryPage />);
    await screen.findByText('Eggs Tray');
    await user.type(screen.getByLabelText('Search products'), 'duck');
    await screen.findByText('Duck Eggs');
    const before = productCalls().length;
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(productCalls().length).toBe(before + 1));
    expect(productCalls().at(-1)[1].params.query).toBe('duck');
  });

  it('stops listening after unmount', async () => {
    mockGet([p()]);
    const { unmount } = render(<InventoryPage />);
    await screen.findByText('Eggs Tray');
    unmount();
    const before = productCalls().length;
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(productCalls()).toHaveLength(before);
  });
});

describe('Stage 4.4 — branch name and wording', () => {
  it('shows the branch name only when the authenticated session already carries it', async () => {
    useAuthStore.setState({ cashier: { id: 'c1', name: 'A', shop: { id: 's1', name: 'Coimbatore Main' } }, status: 'authenticated' });
    mockGet([p()]);
    render(<InventoryPage />);
    await screen.findByText('Eggs Tray');
    expect(screen.getByText('Coimbatore Main')).toBeTruthy();
  });

  it('shows no branch line (and makes no extra API call) when the session has no shop', async () => {
    useAuthStore.setState({ cashier: { id: 'c1', name: 'A' }, status: 'authenticated' });
    const get = mockGet([p()]);
    render(<InventoryPage />);
    await screen.findByText('Eggs Tray');
    expect(screen.queryByText('Coimbatore Main')).toBeNull();
    expect(get.mock.calls.every((c) => c[0] === '/products' || c[0] === '/products/categories')).toBe(true);
  });

  it('refers to the central Admin, not "shop-admin"', async () => {
    mockGet([p()]);
    render(<InventoryPage />);
    await screen.findByText('Eggs Tray');
    expect(screen.getByText(/managed by the central Admin/)).toBeTruthy();
    expect(screen.queryByText(/shop-admin/i)).toBeNull();
  });
});

describe('Stage 4.4 — GUARD: the Cashier inventory page is strictly read-only', () => {
  it('never issues a write request and only reads /products and /products/categories — including refresh and focus', async () => {
    const get = mockGet([p(), p({ id: 'z', name: 'Zero', stock: 0 })]);
    const post = vi.spyOn(apiClient, 'post');
    const put = vi.spyOn(apiClient, 'put');
    const patch = vi.spyOn(apiClient, 'patch');
    const del = vi.spyOn(apiClient, 'delete');
    const request = vi.spyOn(apiClient, 'request');

    render(<InventoryPage />);
    await screen.findByText('Eggs Tray');
    await userEvent.setup().click(screen.getByRole('button', { name: /refresh/i }));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /refresh/i }).disabled).toBe(false));

    for (const spy of [post, put, patch, del, request]) expect(spy).not.toHaveBeenCalled();
    expect(new Set(get.mock.calls.map((c) => c[0]))).toEqual(new Set(['/products', '/products/categories']));
  });

  it('renders no editing controls: the only button is Refresh and the stock cells are plain text', async () => {
    mockGet([p()]);
    render(<InventoryPage />);
    await screen.findByText('Eggs Tray');
    const table = screen.getByRole('table');
    expect(within(table).queryAllByRole('button')).toHaveLength(0);
    expect(within(table).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(table).queryAllByRole('spinbutton')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /adjust|edit|add stock|delete|remove/i })).toBeNull();
  });

  it('static guard: InventoryPage imports no write API module and the Cashier API layer has no inventory/stock write endpoint', () => {
    const root = path.resolve(import.meta.dirname, '../src');
    const page = fs.readFileSync(path.join(root, 'pages/cashier/InventoryPage.jsx'), 'utf8');
    const apiImports = [...page.matchAll(/from '@\/api\/([\w-]+)'/g)].map((m) => m[1]);
    expect(apiImports).toEqual(['products']);
    expect(page).not.toMatch(/\.(post|put|patch|delete)\(/);

    const productsApi = fs.readFileSync(path.join(root, 'api/products.js'), 'utf8');
    expect(productsApi).not.toMatch(/apiClient\.(post|put|patch|delete|request)\(/);

    const offenders = [];
    for (const f of fs.readdirSync(path.join(root, 'api')).filter((n) => /\.js$/.test(n))) {
      const src = fs.readFileSync(path.join(root, 'api', f), 'utf8');
      for (const m of src.matchAll(/apiClient\.(post|put|patch|delete)\(\s*([`'"])([^`'"]*)\2/g)) {
        if (/inventor|stock|adjust|branch-?product|cashier-?inventory/i.test(m[3])) offenders.push(`${f}: ${m[1]} ${m[3]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no Cashier source file references the legacy CashierInventory as a stock source', () => {
    const root = path.resolve(import.meta.dirname, '../src');
    const hits = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(jsx?|tsx?)$/.test(e.name) && /cashier-?inventor/i.test(fs.readFileSync(full, 'utf8'))) hits.push(full);
      }
    };
    walk(root);
    expect(hits).toEqual([]);
  });
});
