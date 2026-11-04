/**
 * UPI QR helpers. Pure functions only — no network, no React.
 *
 * The BACKEND enforces every rule below (reference format, uniqueness across
 * branches of the same Admin, amount validity). Frontend validation here is
 * for cashier UX only and is never treated as proof that a payment is valid.
 */

export const UPI_REFERENCE_MIN = 6;
export const UPI_REFERENCE_MAX = 35;

/**
 * CONTRACT PENDING: error codes below are the proposed ones. BackendV2 is
 * finalizing the real contract — update this map (and nothing else) once it
 * is published.
 */
export const UPI_ERROR_CODES = {
  NOT_CONFIGURED: 'UPI_NOT_CONFIGURED',
  DUPLICATE_REFERENCE: 'DUPLICATE_UPI_REFERENCE',
  REFERENCE_REQUIRED: 'UPI_REFERENCE_REQUIRED',
  INVALID_REFERENCE: 'INVALID_UPI_REFERENCE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
};

/** Trim surrounding whitespace and uppercase (duplicate checks are case-insensitive). */
export function normalizeUpiReference(raw) {
  return String(raw ?? '').trim().toUpperCase();
}

/** Returns an error message, or null when the reference looks valid. */
export function validateUpiReference(raw) {
  const ref = String(raw ?? '').trim();
  if (!ref) return 'Enter the UPI transaction reference.';
  if (!/^[A-Za-z0-9]+$/.test(ref)) return 'Use letters and numbers only — no spaces or special characters.';
  if (ref.length < UPI_REFERENCE_MIN) return `Reference must be at least ${UPI_REFERENCE_MIN} characters.`;
  if (ref.length > UPI_REFERENCE_MAX) return `Reference must be at most ${UPI_REFERENCE_MAX} characters.`;
  return null;
}

/**
 * Converts a rupee amount (number or numeric string) to integer paise.
 * Returns null for anything that must never produce a QR: empty, NaN,
 * zero, negative, or more than 2 decimal places.
 */
export function toPaise(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const scaled = n * 100;
  const paise = Math.round(scaled);
  if (Math.abs(scaled - paise) > 1e-6) return null;
  if (!Number.isSafeInteger(paise) || paise <= 0) return null;
  return paise;
}

/** 30000 -> "300.00" (always 2 decimals, no thousands separator). */
export function paiseToAmountString(paise) {
  const whole = Math.floor(paise / 100);
  const frac = String(paise % 100).padStart(2, '0');
  return `${whole}.${frac}`;
}

const UPI_PREFIX = 'upi://pay?';

/** Parses a upi://pay URI into its fields, or null if it isn't one. */
export function parseUpiUri(uri) {
  if (typeof uri !== 'string' || !uri.startsWith(UPI_PREFIX)) return null;
  const params = new URLSearchParams(uri.slice(UPI_PREFIX.length));
  return {
    pa: params.get('pa'),
    pn: params.get('pn'),
    am: params.get('am'),
    cu: params.get('cu'),
    tr: params.get('tr'),
  };
}

/**
 * Defensive check run on whatever QR payload the backend returns, BEFORE a
 * QR is rendered: the encoded URI must be a UPI pay link whose amount and
 * currency match what the cashier asked for, and whose payee matches the
 * receiver shown on screen. Returns an error message or null.
 */
export function verifyUpiQrPayload(payload, requestedPaise) {
  if (!payload || typeof payload !== 'object') return 'The server returned an invalid UPI QR response.';
  const parsed = parseUpiUri(payload.upiUri);
  if (!parsed) return 'The server returned an invalid UPI payment link.';
  if (!parsed.pa || !payload.upiId || parsed.pa.toLowerCase() !== String(payload.upiId).toLowerCase()) {
    return 'The QR receiver does not match the displayed UPI ID. Please try again.';
  }
  if (parsed.cu !== 'INR') return 'The QR currency is not INR. Please contact your Admin.';
  if (toPaise(parsed.am) !== requestedPaise) {
    return 'The QR amount does not match the payable amount. Please try again.';
  }
  if (!payload.payeeName) return 'The server did not return a receiving name for this QR.';
  return null;
}

/** True when the backend rejected the *reference* itself (show it under the field). */
export function isUpiReferenceError(err) {
  return [
    UPI_ERROR_CODES.DUPLICATE_REFERENCE,
    UPI_ERROR_CODES.REFERENCE_REQUIRED,
    UPI_ERROR_CODES.INVALID_REFERENCE,
  ].includes(err?.code);
}

/**
 * True when the server definitively refused the checkout (nothing was
 * created), so a fresh idempotency key is safe. Network errors/timeouts and
 * 5xx are NOT definitive — the outcome is unknown, so the same key must be
 * reused on retry.
 */
export function isDefinitiveRejection(err) {
  const status = err?.raw?.status;
  return status === 400 || status === 422 || err?.code === UPI_ERROR_CODES.DUPLICATE_REFERENCE;
}
