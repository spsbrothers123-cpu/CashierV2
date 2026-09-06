/**
 * STUB DATA — DEVELOPMENT ONLY
 * ------------------------------------------------------------------
 * Egg Mart has no backend yet. This file exists solely so the Phase 1
 * frontend has something to render against. It is only ever read by
 * src/api/stub/*, which is only ever used when USE_STUB_API is true
 * in src/api/client.js.
 *
 * Nothing in src/components or src/pages imports this file directly.
 * Delete this whole src/api/stub directory once a real backend exists.
 */

export const STUB_SHOP = {
  id: 'shop_main',
  name: 'Egg Mart — Bengaluru Central',
  location: 'Bengaluru Central',
};

export const STUB_CASHIERS = [
  { id: 'cashier_1', name: 'John D.', email: 'john@eggmart.test', password: 'password123', role: 'cashier', active: true },
  { id: 'cashier_2', name: 'Priya S.', email: 'priya@eggmart.test', password: 'password123', role: 'cashier', active: true },
  { id: 'cashier_3', name: 'Ahmed K.', email: 'ahmed@eggmart.test', password: 'password123', role: 'cashier', active: true },
  { id: 'cashier_4', name: 'Riya M.', email: 'riya@eggmart.test', password: 'password123', role: 'cashier', active: false },
];

export const STUB_CATEGORIES = ['Eggs', 'Egg Trays', 'Grocery', 'Dairy', 'Other'];

export const STUB_PRODUCTS = [
  { id: 'p1', name: 'Organic Farm Eggs (12)', sku: 'EGG-ORG-12', barcode: '8901000000011', category: 'Eggs', price: 160, unit: 'tray', stock: 42 },
  { id: 'p2', name: 'Classic White Eggs (30)', sku: 'EGG-WHT-30', barcode: '8901000000028', category: 'Eggs', price: 280, unit: 'tray', stock: 18 },
  { id: 'p3', name: 'Quail Eggs (6)', sku: 'EGG-QUL-06', barcode: '8901000000035', category: 'Eggs', price: 85, unit: 'pack', stock: 30 },
  { id: 'p4', name: 'Brown Country Eggs (12)', sku: 'EGG-BRN-12', barcode: '8901000000042', category: 'Eggs', price: 175, unit: 'tray', stock: 0 },
  { id: 'p5', name: 'Egg Tray — 30 Slot Pulp', sku: 'TRY-PLP-30', barcode: '8901000001011', category: 'Egg Trays', price: 25, unit: 'pc', stock: 120 },
  { id: 'p6', name: 'Egg Tray — 12 Slot Plastic', sku: 'TRY-PLS-12', barcode: '8901000001028', category: 'Egg Trays', price: 35, unit: 'pc', stock: 60 },
  { id: 'p7', name: 'Whole Wheat Bread', sku: 'GRC-BRD-WW', barcode: '8901000002011', category: 'Grocery', price: 45, unit: 'loaf', stock: 24 },
  { id: 'p8', name: 'Amul Butter 500g', sku: 'DRY-BTR-500', barcode: '8901000003011', category: 'Dairy', price: 230, unit: 'pack', stock: 15 },
  { id: 'p9', name: 'Toned Milk 1L', sku: 'DRY-MLK-1L', barcode: '8901000003028', category: 'Dairy', price: 58, unit: 'pack', stock: 40 },
  { id: 'p10', name: 'Paneer 200g', sku: 'DRY-PNR-200', barcode: '8901000003035', category: 'Dairy', price: 90, unit: 'pack', stock: 20 },
  { id: 'p11', name: 'Cooking Oil 1L', sku: 'GRC-OIL-1L', barcode: '8901000002028', category: 'Grocery', price: 165, unit: 'bottle', stock: 33 },
  { id: 'p12', name: 'Egg Carton Labels (Roll)', sku: 'OTH-LBL-01', barcode: '8901000004011', category: 'Other', price: 60, unit: 'roll', stock: 10 },
];

export const STUB_CUSTOMERS = [
  { id: 'c1', name: 'Ramesh Traders', phone: '9876543210', creditBalance: 1200 },
  { id: 'c2', name: 'Sunita Kirana', phone: '9123456780', creditBalance: 0 },
  { id: 'c3', name: 'Fresh Bites Cafe', phone: '9988776655', creditBalance: 450 },
];

// Invitation codes an Admin would issue to a new cashier. Dev/test only —
// a real backend generates, scopes (per shop/branch), and expires these.
export const STUB_INVITE_CODES = [
  { code: '482913', used: false },
  { code: '111222', used: false },
];

// Mutable in-memory stand-ins for session/held-bill/completed-bill state
// during a dev run. Everything here resets on page reload — it exists only
// so Phase 1/2 have something to render against until a real backend exists.
export const stubState = {
  sessions: {}, // cashierId -> Session
  heldBills: [], // HeldBill[]
  bills: [], // Bill[] — completed (paid) bills
  billSeq: 1023, // last-used bill number suffix, so numbers look realistic
  signupRequests: {}, // requestId -> pending cashier signup request (see stub/index.js)
};
