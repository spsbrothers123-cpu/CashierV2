import { apiClient } from './client';

/**
 * Cashier notification API. NO stub: BackendV2 notification endpoints are not
 * implemented yet (see CASHIER_NOTIFICATIONS_API_CONTRACT.md). Until they are,
 * every call rejects (404) and the UI shows its error / "unavailable" states.
 *
 * Scope (cashier + branch) comes from the auth token only — never sent here.
 */

export async function listNotifications({ limit = 20, cursor, status, category, from, to, signal } = {}) {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  if (status && status !== 'all') params.status = status;
  if (category) params.category = category;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await apiClient.get('/notifications', { params, signal });
  return data;
}

export async function getNotification(id) {
  const { data } = await apiClient.get(`/notifications/${encodeURIComponent(id)}`);
  return data;
}

export async function setReadState(id, read) {
  const { data } = await apiClient.put(`/notifications/${encodeURIComponent(id)}/read-state`, { read: !!read });
  return data;
}

export async function deleteNotification(id) {
  const { data } = await apiClient.delete(`/notifications/${encodeURIComponent(id)}`);
  return data;
}

export async function acknowledgeAnnouncement(id, idempotencyKey) {
  const { data } = await apiClient.post(
    `/notifications/${encodeURIComponent(id)}/acknowledge`,
    {},
    { headers: { 'Idempotency-Key': idempotencyKey } }
  );
  return data;
}

export async function getNotificationSettings() {
  const { data } = await apiClient.get('/notifications/settings');
  return data;
}

export async function updateNotificationSettings(categories) {
  const { data } = await apiClient.patch('/notifications/settings', { categories });
  return data;
}
