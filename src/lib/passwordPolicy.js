// Enterprise password policy — enforced client-side on registration.
export const PASSWORD_MIN_LENGTH = 12;

export function scorePassword(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 5);
}

export function passwordRequirements(pw) {
  return {
    length: (pw || "").length >= PASSWORD_MIN_LENGTH,
    lower: /[a-z]/.test(pw || ""),
    upper: /[A-Z]/.test(pw || ""),
    number: /[0-9]/.test(pw || ""),
    symbol: /[^A-Za-z0-9]/.test(pw || ""),
  };
}

export function meetsPasswordPolicy(pw) {
  const r = passwordRequirements(pw);
  return r.length && r.lower && r.upper && r.number && r.symbol;
}

export function strengthLabel(score) {
  return ["Too weak", "Weak", "Fair", "Good", "Strong", "Excellent"][score] || "Too weak";
}