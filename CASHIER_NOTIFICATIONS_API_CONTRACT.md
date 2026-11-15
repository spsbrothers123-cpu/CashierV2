# Cashier Notifications — API Contract (PROPOSAL)

Status: **proposal written by the Cashier Frontend (Phase 2). Not implemented, not accepted by BackendV2.**
The Cashier Frontend calls exactly these endpoints through the shared Axios client (`/api` base). Until BackendV2 ships them every call fails with 404 and the UI shows its error / "unavailable" states. No stub data exists.

Compatibility: names and shapes follow the Admin notification proposal where known to the Cashier team. The Admin draft was not in the supplied baseline, so alignment is an open question (see §13).

## Conventions
- All paths relative to `/api`. JSON only. Timestamps ISO-8601 UTC.
- Auth: `Authorization: Bearer <cashier token>` on every call. The scope (cashier id + assigned branch) is derived **only from the token** — never from a client parameter. The client sends no `cashierId` or `shopId`.
- Categories (exactly five): `inventory`, `account_security`, `session`, `announcement`, `credit`. Transaction alerts are excluded.

## 8. Notification structure
```json
{
  "id": "ntf_123",
  "category": "inventory",
  "type": "low_stock",
  "severity": "warning",
  "title": "Low stock: Brown Eggs (Tray)",
  "message": "12 left (threshold 20).",
  "createdAt": "2026-11-07T04:10:00.000Z",
  "readAt": null,
  "recipientCashierId": "cashier-A",
  "shopId": "shop-1",
  "capabilities": { "canDelete": true },
  "target": { "kind": "product", "id": "prod_9" },
  "announcement": {
    "id": "ann_5", "audience": "individual", "body": "Full text…",
    "requiresAcknowledgement": true, "acknowledgedAt": null
  }
}
```
- `type` values: `low_stock | out_of_stock | restocked | password_changed | account_changed | recovery_status | session_opened | session_closed | cash_mismatch | closing_reminder | announcement | credit_overdue | credit_due_date_changed | credit_adjusted | credit_cleared`.
- `readAt` and `announcement.acknowledgedAt` are **independent**. Acknowledging never changes `readAt`; reading never sets `acknowledgedAt`.
- `announcement` present only for `category = announcement`. `shopId` is `null` for all-cashiers announcements.
- `capabilities.canDelete` absent ⇒ the client treats it as **not deletable** and hides the action.
- `account_security` notifications must contain only safe text: never passwords, tokens, recovery codes, or another cashier's data. `message` is rendered as plain text.
- Inventory notifications are generated server-side from the same threshold source as Admin, once per stock-state transition. The client never computes thresholds.

## 1. List notifications
`GET /notifications?limit=20&cursor=<opaque>&status=all|unread&category=<cat>&from=<ISO>&to=<ISO>`
→ `200 { "items": [Notification], "nextCursor": "<opaque>|null", "unreadCount": 3 }`
- Sorted `createdAt` desc. `from`/`to` inclusive bounds on `createdAt`. `limit` max 50.
- `unreadCount` = total unread for this cashier, **ignoring** the filters.
- Optional single fetch: `GET /notifications/:id` → `200 Notification` (404 if not this cashier's).

## 7. Pagination and unread count
- Cursor pagination; the client appends pages and never assumes a total. A cursor from a different filter set is invalid → `400 INVALID_CURSOR`.
- Unread count also in every mutating response (below). Dedicated `GET /notifications/unread-count → { "unreadCount": n }` is optional (client doesn't require it).

## 2. Mark read / unread
`PUT /notifications/:id/read-state` body `{ "read": true|false }`
→ `200 { "notification": Notification, "unreadCount": n }`. Idempotent. Opening/viewing never marks read; only this call does.

## 3. Delete
`DELETE /notifications/:id` → `200 { "id": "ntf_123", "unreadCount": n }`. Only when `capabilities.canDelete` is true; otherwise `403 NOTIFICATION_NOT_DELETABLE`. Unknown/not-yours → `404`. Repeating a delete returns `404` (client treats 404 as already gone).

## 4. Acknowledge announcement
`POST /notifications/:id/acknowledge` headers `Idempotency-Key: <uuid>` body `{}`
→ `200 { "notification": Notification, "unreadCount": n }` with `announcement.acknowledgedAt` set.
- Only for announcements with `requiresAcknowledgement`; otherwise `409 ACKNOWLEDGEMENT_NOT_REQUIRED`.
- Does **not** change `readAt`.

## 12. Idempotency (acknowledge)
- Uniqueness is (announcement, cashier). A repeat acknowledge — same or different key, retry after timeout — returns `200` with the **original** `acknowledgedAt`; it never creates a second record or moves the timestamp.
- The client generates one `Idempotency-Key` per user click, blocks double clicks while in flight, and reuses the same key if it retries that click.

## 5/6. Settings
`GET /notifications/settings` →
```json
{ "categories": [
  { "category": "inventory", "enabled": true, "mutable": true },
  { "category": "account_security", "enabled": true, "mutable": false, "mandatoryReason": "Security notifications cannot be turned off." }
] }
```
`PATCH /notifications/settings` body `{ "categories": { "inventory": false } }` → `200` full settings object as above.
- `mutable:false` ⇒ the UI shows it as always on / locked. Server must reject changes to immutable categories with `403 SETTING_NOT_MUTABLE`.
- `404`/`501` on either endpoint ⇒ the UI says preferences are unavailable. Nothing is stored locally.

## 9. Related-record navigation metadata
`target: { kind, id? }`, never a URL or path. The client maps `kind` to existing routes it owns:
| kind | Cashier route |
|---|---|
| `product` | `/cashier/inventory` |
| `session` | `/cashier/sessions` |
| `account` | `/cashier/profile` |
| `bill` | `/cashier/history` |
| `credit_customer` | no Cashier route exists today → no Open action |
Unknown kinds show no Open action.

## 10. Authentication and branch authorization (backend must enforce)
- Cashier token required; 401 otherwise.
- Every read/mutation limited to notifications whose recipient is the authenticated Cashier. One Cashier per branch; branch derived from the token's assigned shop.
- Announcements: only those targeted to this Cashier or to all eligible Cashiers of the central Admin.
- Credit notifications: only this branch's credit, and only if the Cashier holds credit permission.
- Another cashier's/branch's id in a path → `404` (not `403`) to avoid existence leaks.
- Cashiers cannot create or edit announcements; no such endpoint.
- Client defence-in-depth: drops any item whose `recipientCashierId` ≠ current cashier or `shopId` ≠ current branch. This is a guard, not authorization.

## 11. Error format
```json
{ "code": "NOTIFICATION_NOT_FOUND", "message": "Human readable.", "details": {} }
```
Codes used: `UNAUTHENTICATED`(401), `ACCOUNT_NOT_ACTIVE`(403, existing client logout behaviour), `NOTIFICATION_NOT_FOUND`(404), `NOTIFICATION_NOT_DELETABLE`(403), `SETTING_NOT_MUTABLE`(403), `ACKNOWLEDGEMENT_NOT_REQUIRED`(409), `INVALID_CURSOR`(400), `VALIDATION_ERROR`(400). Matches the existing `{code,message}` shape `normalizeError` reads.

## 13. Unresolved questions
1. Does the Admin proposal use the same paths/field names? Align before Phase 3.
2. Should acknowledging imply read? (Frontend assumes **no**.)
3. Which notification types are deletable (`canDelete`)? Are announcements/security ones ever?
4. Is `GET /notifications/:id` accepted (used for deep links from the dropdown)?
5. Real-time delivery (push/SSE) is out of scope; the client refetches on mount, on opening the bell, on tab focus and on manual refresh. Is polling acceptable, and at what interval?
6. Credit permission: how is it exposed so `credit` is hidden/disabled when the Cashier lacks it?
7. Retention: how long are notifications kept and is deletion soft (per-cashier)?
8. Closing-reminder timing source (Admin branch closing time) and de-duplication are backend responsibilities — confirm.
9. A product/credit/bill deep-link route does not exist in the Cashier app (list pages only).
