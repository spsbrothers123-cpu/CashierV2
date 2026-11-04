import { create } from 'zustand';
import { holdBill as apiHoldBill } from '@/api/bills';

export const useCartStore = create((set, get) => ({
  // { product, quantity, unitPrice } — unitPrice is ALWAYS product.price (the
  // backend-resolved effective branch price). Cashiers cannot override it;
  // the backend re-resolves the price at checkout regardless.
  items: [],
  customer: null,

  /**
   * Adds one unit. Stock is the branch quantity the backend reported.
   * Returns true if the cart changed, false if blocked by stock.
   */
  addProduct(product) {
    const available = Number(product.stock) || 0;
    const existing = get().items.find((i) => i.product.id === product.id);
    const nextQty = (existing?.quantity ?? 0) + 1;
    if (available <= 0 || nextQty > available) return false;
    set((state) => {
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, product, quantity: nextQty, unitPrice: product.price } : i
          ),
        };
      }
      return { items: [...state.items, { product, quantity: 1, unitPrice: product.price }] };
    });
    return true;
  },

  /**
   * Add a product with an explicit quantity (used by the edit modal), or
   * overwrite the existing line's quantity. Quantity is capped at the
   * branch stock the backend reported; there is no price override.
   * Returns true if applied, false if blocked (zero stock / over stock).
   */
  upsertCartItem(product, { quantity }) {
    const available = Number(product.stock) || 0;
    if (available <= 0 || quantity > available) return false;
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, product, quantity, unitPrice: product.price } : i
          ),
        };
      }
      return { items: [...state.items, { product, quantity, unitPrice: product.price }] };
    });
    return true;
  },

  updateQuantity(productId, quantity) {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((i) => i.product.id !== productId) };
      }
      return {
        items: state.items.map((i) => {
          if (i.product.id !== productId) return i;
          // Never let a cart line exceed the branch stock the backend reported.
          const available = Number(i.product.stock);
          const capped = Number.isFinite(available) ? Math.min(quantity, available) : quantity;
          return { ...i, quantity: capped };
        }),
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
