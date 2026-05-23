/** Practical email check: local@domain.tld (TLD ≥ 2 chars). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PASSWORD_RULES = [
  { id: "length",  label: "At least 8 characters",     test: (p: string) => p.length >= 8 },
  { id: "lower",   label: "One lowercase letter (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "upper",   label: "One uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "digit",   label: "One number (0–9)",          test: (p: string) => /[0-9]/.test(p) },
  { id: "symbol",  label: "One symbol (!@#$…)",        test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export type PasswordRule = (typeof PASSWORD_RULES)[number];

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Enter your email address.";
  if (!EMAIL_RE.test(trimmed)) {
    return "Enter a valid email (e.g. you@school.com).";
  }
  return null;
}

export function getUnmetPasswordRules(password: string) {
  return PASSWORD_RULES.filter((rule) => !rule.test(password));
}
