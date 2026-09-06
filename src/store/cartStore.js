import { create } from 'zustand';
import { holdBill as apiHoldBill } from '@/api/bills';

export const useCartStore = create((set, get) => ({
  items: [], // { product, quantity, unitPrice } — unitPrice is a bill-only override, never written back to product.price
  customer: null,

  addProduct(product) {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { product, quantity: 1, unitPrice: product.price }] };
    });
  },

  /**
   * Add a product to the cart with an explicit quantity/price (used by the
   * product-edit modal), or overwrite an already-present line for the same
   * product with the new quantity/price rather than incrementing it — the
   * modal always shows the item's full intended state, not a delta.
   * `unitPrice` is a bill-level override only; `product.price` (the master/
   * catalog price) is never mutated.
   */
  upsertCartItem(product, { quantity, unitPrice }) {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      const resolvedPrice = unitPrice ?? product.price;
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, quantity, unitPrice: resolvedPrice } : i
          ),
        };
      }
      return { items: [...state.items, { product, quantity, unitPrice: resolvedPrice }] };
    });
  },

  updateQuantity(productId, quantity) {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((i) => i.product.id !== productId) };
      }
      return {
        items: state.items.map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
      };
    });
  },

  removeProduct(productId) {
    set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) }));
  },

  setCustomer(customer) {
    set({ customer });
  },

  clearCart() {
    set({ items: [], customer: null });
  },

  /** Frontend-computed totals — for UI feedback only. The backend
   * recomputes and remains authoritative at checkout time. */
  totals() {
    const { items } = get();
    const subtotal = items.reduce((sum, i) => sum + (i.unitPrice ?? i.product.price) * i.quantity, 0);
    // No discount/tax rules exist from the backend yet — surfaced as 0
    // rather than invented, per "never trust/fake frontend totals".
    const discount = 0;
    const tax = 0;
    const grandTotal = subtotal - discount + tax;
    return { subtotal, discount, tax, grandTotal };
  },

  async holdCurrentBill({ shopId, label }) {
    const { items, customer, totals } = get();
    if (items.length === 0) return { ok: false, error: { message: 'Cart is empty.' } };
    try {
      const bill = await apiHoldBill({
        shopId,
        label: label || `Bill ${new Date().toLocaleTimeString('en-IN')}`,
        customer,
        items,
        amount: totals().grandTotal,
      });
      set({ items: [], customer: null });
      return { ok: true, bill };
    } catch (error) {
      return { ok: false, error };
    }
  },
}));
