import { apiClient, USE_STUB_API, getToken } from './client';
import { stubApi } from './stub';

/**
 * BACKEND ENDPOINT REQUIRED (when USE_STUB_API is false):
 *   POST /auth/login          { email, password } -> { token, cashier }
 *   GET  /auth/me                                  -> Cashier
 *   POST /auth/logout
 */
export async function login({ email, password }) {
  if (USE_STUB_API) return stubApi.login({ email, password });
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

export async function fetchCurrentCashier() {
  if (USE_STUB_API) return stubApi.me(getToken());
  const { data } = await apiClient.get('/auth/me');
  return data;
}

export async function logout() {
  if (USE_STUB_API) return stubApi.logout();
  const { data } = await apiClient.post('/auth/logout');
  return data;
}

/**
 * Cashier signup (Invite Code -> Account -> Email OTP verification -> Pending
 * admin approval). This is registration only — normal cashier login (above)
 * stays email/username + password with no OTP step.
 *
 * BACKEND ENDPOINT REQUIRED (when USE_STUB_API is false):
 *   POST /auth/signup/verify-invite  { code }                              -> { verificationToken }
 *   GET  /auth/branches                                                    -> [{ id, name, location, available }]
 *   POST /auth/signup                { name, email, password, shopId,
 *                                      verificationToken }                 -> { requestId, email }
 *
 * Phase 2 Stage 2.4/2.8: the cashier SELECTS an existing branch (shopId from
 * GET /auth/branches). Free-text branch names are never sent — a branch can
 * only be created by the Central Admin.
 *   POST /auth/signup/verify-otp     { requestId, code }                   -> { ok, status }
 *   POST /auth/signup/resend-otp     { requestId }                         -> { ok }
 *   GET  /auth/signup/status         ?requestId=                           -> { status, name, email }
 *
 * verifyInvitationCode() must be called first — its verificationToken proves
 * the cashier holds a valid, admin-issued invite and is required by signup().
 * Callers should render whatever `message` a thrown error carries (see
 * normalizeError in ./client) rather than assuming a specific shape beyond
 * `status` / `ok`.
 */
export async function verifyInvitationCode({ code }) {
  if (USE_STUB_API) return stubApi.verifyInvitationCode({ code });
  const { data } = await apiClient.post('/auth/signup/verify-invitation', { code });
  return data;
}

export async function getBranches() {
  // No stub branch list: never fabricate branches the backend doesn't have.
  if (USE_STUB_API) {
    throw { status: 501, message: 'Branch selection requires the live backend.' };
  }
  const { data } = await apiClient.get('/auth/branches');
  return data;
}

export async function signup({ name, email, password, shopId, verificationToken }) {
  if (USE_STUB_API) return stubApi.signup({ name, email, password, branchName: shopId, verificationToken });
  const { data } = await apiClient.post('/auth/signup', {
    name,
    email,
    password,
    shopId,
    verificationToken,
  });
  return data;
}

export async function verifySignupOtp({ requestId, code }) {
  if (USE_STUB_API) return stubApi.verifySignupOtp({ requestId, code });
  const { data } = await apiClient.post('/auth/signup/verify-otp', { requestId, code });
  return data;
}

export async function resendSignupOtp({ requestId }) {
  if (USE_STUB_API) return stubApi.resendSignupOtp({ requestId });
  const { data } = await apiClient.post('/auth/signup/resend-otp', { requestId });
  return data;
}

export async function getSignupStatus({ requestId }) {
  if (USE_STUB_API) return stubApi.getSignupStatus({ requestId });
  const { data } = await apiClient.get('/auth/signup/status', { params: { requestId } });
  return data;
}

/**
 * Forgot Password — admin-assisted recovery (Egg Mart V2.0). No email, OTP or
 * reset link is used anywhere in this flow.
 *
 *   1. requestCashierRecovery({ email })
 *        POST /auth/cashier-recovery/request  { email } -> { success, data: null, message }
 *      ALWAYS the same generic answer, whether or not the email is eligible —
 *      never treat it as proof the account exists.
 *   2. The central Admin verifies the Cashier IN PERSON and hands over a
 *      one-time recovery code. The request expires 15 minutes after step 1.
 *   3. resetCashierPassword({ email, code, newPassword })
 *        POST /auth/cashier-recovery/reset    { email, code, newPassword }
 *      One atomic server transaction: consume the code, set the new password,
 *      revoke every existing session. Every verification failure is the same
 *      400 (code RECOVERY_VERIFICATION_FAILED).
 *
 * Deliberately NO stub/mock branch: this must never pretend a request was
 * filed or a password was reset. The code and password go only in the POST
 * body — never in a URL, storage or a log.
 */
export async function requestCashierRecovery({ email }) {
  const { data } = await apiClient.post('/auth/cashier-recovery/request', { email });
  return data;
}

export async function resetCashierPassword({ email, code, newPassword }) {
  const { data } = await apiClient.post('/auth/cashier-recovery/reset', { email, code, newPassword });
  return data;
}
