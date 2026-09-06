/**
 * Client-side validation helpers for the cashier signup flow.
 * Mirrors (but does not replace) whatever validation the real backend
 * will eventually enforce server-side.
 */

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

/** Individual password requirement checks, used to render the live checklist. */
export function getPasswordChecks(password = '') {
  return {
    minLength: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
}

export function isPasswordValid(password) {
  const checks = getPasswordChecks(password);
  return checks.minLength && checks.hasLetter && checks.hasNumber;
}

/** Rough strength meter — cosmetic only, not a substitute for the checks above. */
export function getPasswordStrength(password = '') {
  if (!password) return { label: '', score: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Weak', score: 1 };
  if (score <= 3) return { label: 'Fair', score: 2 };
  return { label: 'Strong', score: 3 };
}
