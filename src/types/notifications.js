/**
 * Cashier notification shapes (JSDoc only — this is a JS project, not TS).
 * These mirror CASHIER_NOTIFICATIONS_API_CONTRACT.md. The contract is a
 * PROPOSAL: BackendV2 has not implemented or accepted it yet.
 *
 * @typedef {'inventory'|'account_security'|'session'|'announcement'|'credit'} NotificationCategory
 *
 * @typedef {Object} NotificationTarget   // related-record metadata (never a URL)
 * @property {'product'|'session'|'account'|'credit_customer'|'bill'} kind
 * @property {string} [id]
 *
 * @typedef {Object} AnnouncementInfo
 * @property {string} id
 * @property {'individual'|'all_cashiers'} audience
 * @property {string} body
 * @property {boolean} requiresAcknowledgement
 * @property {string|null} acknowledgedAt   // ISO; null while pending
 *
 * @typedef {Object} CashierNotification
 * @property {string} id
 * @property {NotificationCategory} category
 * @property {string} type
 * @property {'info'|'warning'|'critical'} severity
 * @property {string} title
 * @property {string} message
 * @property {string} createdAt             // ISO
 * @property {string|null} readAt           // ISO; null = unread (independent of acknowledgement)
 * @property {string} [recipientCashierId]
 * @property {string|null} [shopId]
 * @property {{canDelete?: boolean}} [capabilities]
 * @property {NotificationTarget|null} [target]
 * @property {AnnouncementInfo} [announcement]
 */

export const NOTIFICATION_CATEGORIES = ['inventory', 'account_security', 'session', 'announcement', 'credit'];

export const CATEGORY_LABELS = {
  inventory: 'Inventory Alerts',
  account_security: 'Account & Security',
  session: 'Session',
  announcement: 'Admin Announcements',
  credit: 'Credit',
};

export const CATEGORY_DESCRIPTIONS = {
  inventory: 'Low stock, out of stock and restocked products.',
  account_security: 'Password, account and recovery status updates.',
  session: 'Session opened/closed, cash mismatch and closing reminders.',
  announcement: 'Messages from the Admin to you or to all cashiers.',
  credit: 'Overdue credit and Admin credit updates.',
};
