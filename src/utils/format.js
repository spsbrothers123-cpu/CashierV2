/** Masks an email for display during OTP verification, e.g. "s***@gmail.com". */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (!local) return `***@${domain}`;
  return `${local[0]}***@${domain}`;
}
