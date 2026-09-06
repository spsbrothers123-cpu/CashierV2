# Egg Mart Cashier Frontend — Phase 1

## Run it

```
npm install
npm run dev
```

Open http://localhost:5173 — you'll land on `/cashier/login`.

## Test logins (stub data, no backend yet)

| Email | Password | Notes |
|---|---|---|
| john@eggmart.test | password123 | active cashier |
| priya@eggmart.test | password123 | active cashier (2nd cashier, same shop) |
| ahmed@eggmart.test | password123 | active cashier |
| riya@eggmart.test | password123 | **inactive** — demonstrates the inactive-account error |

Any other email/password shows an invalid-credentials error.

## What's stubbed vs. real

- `src/api/*.js` are the real API modules your components call — they already match the
  contracts documented in each file's `BACKEND ENDPOINT REQUIRED` comment.
- They currently route to `src/api/stub/` (in-memory fake data + artificial latency) because
  no backend exists yet. This is controlled by a single flag: `USE_STUB_API` in `src/api/client.js`.
- To connect the real backend: set `VITE_API_BASE_URL` in `.env`, flip `USE_STUB_API` to `false`,
  and delete `src/api/stub/`. No component or page needs to change.

## Phase 1 scope implemented

- Cashier login (multi-cashier, inactive/invalid/network/server error states, show password, remember me)
- Protected `/cashier/*` routes, backend-authoritative session hydration
- Session gate: must "Start Session" before Billing/Inventory/Reports/History are reachable
- Cashier layout: collapsible desktop sidebar, mobile drawer + bottom nav, top header
  (shop, session status, live time, cashier)
- Billing page: searchable/filterable product catalogue, barcode entry flow, cart with
  qty controls, customer selector, hold-bill (list/resume/delete), bill totals
- Loading / empty / error states everywhere data is fetched
- Payment UI (method tiles + Complete Payment) is intentionally non-functional — actual
  checkout is Phase 2 per the spec

## Known placeholders

- Inventory, Reports, History pages are empty-state placeholders (Phase 1 spec doesn't
  require full features there, only the nav destinations)
- Barcode "scanning" accepts manual/keyboard-wedge entry (typical for USB/BT POS scanners);
  camera-based capture wasn't wired since no scanner library/hardware was specified
