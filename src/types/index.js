/**
 * Shared shape references (JSDoc only — this is a JS project, not TS).
 * Keep these in sync with the real backend's API contracts once available.
 *
 * @typedef {Object} Cashier
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} role            // 'cashier' | 'admin'
 * @property {boolean} active
 * @property {Shop} shop
 *
 * @typedef {Object} Shop
 * @property {string} id
 * @property {string} name
 * @property {string} [location]
 *
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} cashierId
 * @property {string} shopId
 * @property {'active'|'closed'} status
 * @property {string} startedAt        // ISO datetime
 * @property {number} openingCash
 * @property {number} [closedAt]
 *
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {string} [sku]
 * @property {string} [barcode]
 * @property {string} category
 * @property {number} price
 * @property {string} unit
 * @property {number} stock
 * @property {string} [imageUrl]
 *
 * @typedef {Object} CartItem
 * @property {Product} product
 * @property {number} quantity
 * @property {number} [unitPrice]   // bill-level price override for this line; falls back to product.price when absent. Never written back to the product/catalog.
 *
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} name
 * @property {string} phone
 * @property {number} [creditBalance]
 *
 * @typedef {Object} HeldBill
 * @property {string} id
 * @property {string} label
 * @property {Customer|null} customer
 * @property {CartItem[]} items
 * @property {number} amount
 * @property {string} heldAt           // ISO datetime
 *
 * @typedef {Object} Payment
 * @property {string} method           // 'cash' | 'card' | 'upi' | 'credit'
 * @property {number} amount
 * @property {string} [reference]      // card: optional. UPI: REQUIRED, 6-35 chars A-Za-z0-9, sent normalized (trimmed, uppercase); backend enforces + de-duplicates
 * @property {number} [cashReceived]   // cash method only
 * @property {number} [change]         // cash method only
 *
 * @typedef {Object} UpiQrPayload      // internal shape the UI uses (see api/upi.js adapter; CONTRACT PENDING)
 * @property {string} payeeName        // receiving shop/business name shown to the cashier
 * @property {string} upiId            // receiving UPI ID shown to the cashier
 * @property {string} upiUri           // upi://pay?pa=&pn=&am=&cu=INR... — encoded into the QR; amount/currency/payee are re-verified client-side before rendering
 *
 * @typedef {Object} Bill
 * @property {string} id
 * @property {string} billNumber
 * @property {string} shopId
 * @property {Shop} [shop]
 * @property {string} cashierId
 * @property {string} [cashierName]
 * @property {string} sessionId
 * @property {Customer|null} customer
 * @property {CartItem[]} items
 * @property {number} subtotal
 * @property {number} discount
 * @property {number} tax
 * @property {number} grandTotal
 * @property {Payment[]} payments
 * @property {'paid'} status
 * @property {string} createdAt        // ISO datetime
 *
 * @typedef {Object} SessionSummary
 * @property {number} sales
 * @property {number} billCount
 * @property {number} cashSales
 * @property {number} cardSales
 * @property {number} upiSales
 * @property {number} creditSales
 * @property {number} expectedCash     // openingCash + cashSales
 *
 * @typedef {Object} SalesReport
 * @property {number} sales
 * @property {number} billCount
 * @property {number} averageBillValue
 * @property {number} cashSales
 * @property {number} cardSales
 * @property {number} upiSales
 * @property {number} creditSales
 * @property {{name: string, quantity: number, revenue: number}[]} topProducts
 * @property {{label: string, value: number}[]} trend
 */
export {};
