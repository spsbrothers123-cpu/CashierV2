import { formatCurrency, formatDateTime } from './currency';

const METHOD_LABEL = { cash: 'Cash', card: 'Card', upi: 'UPI', credit: 'Credit' };

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Opens a plain, print-ready receipt in a new window and triggers the
 * browser's native print dialog. This is deliberately dependency-free
 * (no printer SDK exists yet) — swap this out once real POS printer/
 * browser printing architecture is specified.
 */
export function printReceipt(bill) {
  const win = window.open('', '_blank', 'width=380,height=640');
  if (!win) return;

  const itemRows = bill.items
    .map((i) => {
      const unitPrice = i.unitPrice ?? i.product.price;
      return `
      <tr>
        <td>${escapeHtml(i.product.name)}</td>
        <td class="num">${i.quantity}</td>
        <td class="num">${escapeHtml(formatCurrency(unitPrice))}</td>
        <td class="num">${escapeHtml(formatCurrency(unitPrice * i.quantity))}</td>
      </tr>`;
    })
    .join('');

  const paymentRows = bill.payments
    .map(
      (p) => `
      <tr>
        <td>${METHOD_LABEL[p.method] || p.method}${p.reference ? ` (${escapeHtml(p.reference)})` : ''}</td>
        <td class="num">${escapeHtml(formatCurrency(p.amount))}</td>
      </tr>`
    )
    .join('');

  win.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Receipt ${escapeHtml(bill.billNumber)}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color: #1F201D; padding: 16px; width: 320px; margin: 0 auto; }
        h1 { font-size: 15px; text-align: center; margin: 0 0 2px; }
        .sub { text-align: center; font-size: 11px; color: #55564F; margin-bottom: 10px; }
        .divider { border-top: 1px dashed #999; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; vertical-align: top; }
        .num { text-align: right; white-space: nowrap; }
        .meta td:first-child { color: #55564F; }
        .totals td { padding: 3px 0; }
        .grand { font-weight: bold; font-size: 13px; }
        .foot { text-align: center; margin-top: 14px; font-size: 11px; color: #55564F; }
        @media print { body { padding: 0; width: auto; } }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(bill.shop?.name || 'Egg Mart')}</h1>
      <p class="sub">${escapeHtml(bill.shop?.location || '')}</p>
      <div class="divider"></div>
      <table class="meta">
        <tr><td>Bill No.</td><td class="num">${escapeHtml(bill.billNumber)}</td></tr>
        <tr><td>Date</td><td class="num">${escapeHtml(formatDateTime(bill.createdAt))}</td></tr>
        <tr><td>Cashier</td><td class="num">${escapeHtml(bill.cashierName || '')}</td></tr>
        <tr><td>Customer</td><td class="num">${escapeHtml(bill.customer?.name || 'Walk-in')}</td></tr>
      </table>
      <div class="divider"></div>
      <table>
        <thead><tr><td><b>Item</b></td><td class="num"><b>Qty</b></td><td class="num"><b>Rate</b></td><td class="num"><b>Amt</b></td></tr></thead>
        ${itemRows}
      </table>
      <div class="divider"></div>
      <table class="totals">
        <tr><td>Subtotal</td><td class="num">${escapeHtml(formatCurrency(bill.subtotal))}</td></tr>
        <tr><td>Discount</td><td class="num">-${escapeHtml(formatCurrency(bill.discount))}</td></tr>
        <tr><td>Tax</td><td class="num">${escapeHtml(formatCurrency(bill.tax))}</td></tr>
        <tr class="grand"><td>Total</td><td class="num">${escapeHtml(formatCurrency(bill.grandTotal))}</td></tr>
      </table>
      <div class="divider"></div>
      <table>${paymentRows}</table>
      <div class="divider"></div>
      <p class="foot">Thank you for shopping with us!</p>
      <script>window.onload = () => { window.print(); };</script>
    </body>
    </html>
  `);
  win.document.close();
}
