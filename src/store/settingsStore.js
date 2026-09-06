import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Cashier-level UI preferences only (spec section 19). These are NOT synced
 * to any backend — no such endpoint is documented — so they persist to
 * localStorage on this device only. Shop/GST/product/staff/admin settings
 * are intentionally out of scope here.
 */
export const useSettingsStore = create(
  persist(
    (set) => ({
      catalogueView: 'grid', // 'grid' | 'list'
      receiptAutoPrint: false,
      receiptShowLogo: true,
      soundOnAddToCart: true,
      soundOnPaymentSuccess: true,

      setCatalogueView: (catalogueView) => set({ catalogueView }),
      toggle: (key) => set((state) => ({ [key]: !state[key] })),
      reset: () =>
        set({
          catalogueView: 'grid',
          receiptAutoPrint: false,
          receiptShowLogo: true,
          soundOnAddToCart: true,
          soundOnPaymentSuccess: true,
        }),
    }),
    { name: 'eggmart_cashier_settings' }
  )
);
