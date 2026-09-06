export function makeIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
