import { apiClient, USE_STUB_API } from './client';

/**
 * CONTRACT PENDING — BackendV2 is inspecting the current backend and will
 * finalize the contract for: effective UPI receiver lookup, amount-based QR
 * generation, manual confirmation, duplicate-reference validation and the
 * missing-configuration / payment errors.
 *
 * Until then, everything that depends on the contract is isolated in THIS
 * file (the endpoint path and `adaptQrResponse`). When the real contract is
 * published, only this file and `UPI_ERROR_CODES` in utils/upi.js change.
 *
 * Nothing here fabricates a response. If the endpoint is missing or answers
 * with an unexpected shape, the caller gets an error — never a QR and never
 * a payment success.
 *
 * PROVISIONAL (not yet confirmed by the backend):
 *   POST /payments/upi/qr   { amount: "300.00" }
 *     -> { payeeName, upiId, upiUri, ... }
 *   The shop is derived by the backend from the auth token; the client sends
 *   no shopId. Receiver priority (shop account -> common Admin account ->
 *   UPI_NOT_CONFIGURED) is the backend's responsibility.
 *
 * Manual confirmation is NOT a separate call: the transaction reference
 * travels in the existing POST /bills/checkout payload (payments[].reference),
 * so the backend validates it inside the same transaction as the bill.
 */
const QR_ENDPOINT = '/payments/upi/qr'; // PROVISIONAL

/** Maps the backend response onto the internal shape the UI uses. */
function adaptQrResponse(data) {
  if (!data || typeof data !== 'object') {
    throw { kind: 'invalid_response', message: 'Unexpected response while generating the UPI QR.' };
  }
  return {
    payeeName: data.payeeName,
    upiId: data.upiId,
    upiUri: data.upiUri,
  };
}

/**
 * @param {{ amount: string, signal?: AbortSignal }} args  amount is a 2-decimal rupee string, e.g. "300.00"
 * @returns {Promise<{ payeeName: string, upiId: string, upiUri: string }>}
 */
export async function requestUpiQr({ amount, signal }) {
  if (USE_STUB_API) {
    // The stub intentionally has no UPI support: no mock payment behaviour.
    throw { kind: 'unsupported', message: 'UPI QR payments need the live backend.' };
  }
  const { data } = await apiClient.post(QR_ENDPOINT, { amount }, { signal });
  return adaptQrResponse(data);
}
