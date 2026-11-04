# Amount-Based UPI QR — frontend status

**Status:** UI complete. Backend integration is **CONTRACT PENDING** (BackendV2 agent is finalizing it).
No mock payment success exists anywhere in the app. The stub API has no UPI support on purpose.

## What the frontend does
- UPI selected in single mode (tile click, or preselected from Cart) -> QR popup opens automatically.
- Split mode: **Show QR** button on each UPI line, enabled only for a valid amount (> 0, max 2 decimals).
- QR amount = the UPI portion only (single: grand total; split: that line's amount). Converted via integer paise.
- Closing/cancelling the popup returns to payment selection; nothing is submitted, cart is untouched.
- Every popup mount requests a fresh QR; changing a split UPI line's amount/method clears its confirmed reference.
- Confirm Payment:
  - single: submits the existing `POST /bills/checkout` with `payments[0].reference`.
  - split: attaches the reference to that line; bill completes via the normal Complete Payment button.
- Client rules (UX only): reference trimmed, 6-35 chars, A-Z a-z 0-9, sent uppercase; unique within the bill.

## What the backend must provide (all PROVISIONAL until BackendV2 publishes the contract)
1. Receiver lookup + QR payload for an amount. Shop is derived from the auth token (no `shopId` from client).
   Receiver priority: shop UPI account -> common Admin UPI account -> not-configured error.
   Currently assumed: `POST /payments/upi/qr { amount: "300.00" } -> { payeeName, upiId, upiUri }`.
2. `POST /bills/checkout`: for `method: "upi"`, `reference` mandatory + validated (rules above) + unique across
   all branches of the same Admin (case-insensitive). Reject without creating a bill / deducting stock.
3. Errors the UI keys off (`error.code`): `UPI_NOT_CONFIGURED`, `DUPLICATE_UPI_REFERENCE`, `UPI_REFERENCE_REQUIRED`,
   `INVALID_UPI_REFERENCE`, `INVALID_AMOUNT`. For duplicates, `{ reference }` in the error body lets the UI clear
   the right split line.
4. A rejected checkout must NOT persist its idempotency key. The client sends a fresh key after a definitive
   400/422/duplicate rejection, and reuses the same key after network errors / timeouts / 5xx.

## Where to change things when the contract lands
- Endpoint path + response mapping: `src/api/upi.js` (`QR_ENDPOINT`, `adaptQrResponse`) — nothing else.
- Error codes: `UPI_ERROR_CODES` in `src/utils/upi.js`.
- Client-side QR sanity check (URI amount/currency/payee must match): `verifyUpiQrPayload` in `src/utils/upi.js`.
