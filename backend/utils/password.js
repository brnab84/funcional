// Shared password policy. Source of truth for register + reset.
// Standard for this app: 8-100 chars, with lowercase, uppercase and a number.
function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters';
  if (pw.length > 100) return 'Password must be at most 100 characters';
  if (!/[a-z]/.test(pw)) return 'Password must include a lowercase letter';
  if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter';
  if (!/[0-9]/.test(pw)) return 'Password must include a number';
  return null; // valid
}
module.exports = { validatePassword };
