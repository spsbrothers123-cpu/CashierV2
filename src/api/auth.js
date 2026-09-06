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
 *   POST /auth/signup                { name, email, password, branchName,
 *                                      verificationToken }                 -> { requestId, email }
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

export async function signup({ name, email, password, branchName, verificationToken }) {
  if (USE_STUB_API) return stubApi.signup({ name, email, password, branchName, verificationToken });
  const { data } = await apiClient.post('/auth/signup', {
    name,
    email,
    password,
    branchName,
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
