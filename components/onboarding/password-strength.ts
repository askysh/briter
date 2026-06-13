export const MIN_PASSWORD_LENGTH = 10;

export type PasswordRequirement = {
  id: string;
  label: string;
  met: boolean;
};

export type PasswordAssessment = {
  requirements: PasswordRequirement[];
  /** Number of satisfied requirements. */
  score: number;
  /** Whether the password clears the hard minimum (length). */
  acceptable: boolean;
  /** Coarse strength bucket for the meter. */
  strength: "empty" | "weak" | "fair" | "strong";
  label: string;
};

/**
 * Assess a candidate admin password. The only HARD rule (enforced server-side
 * too) is the length minimum; the other checks are encouragement, not gates, so
 * a long passphrase of lowercase words still counts as acceptable.
 */
export function assessPassword(password: string): PasswordAssessment {
  const requirements: PasswordRequirement[] = [
    {
      id: "length",
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: "case",
      label: "Mix of upper and lower case",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      id: "number",
      label: "A number",
      met: /\d/.test(password),
    },
    {
      id: "symbol",
      label: "A symbol",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const score = requirements.filter((r) => r.met).length;
  const acceptable = password.length >= MIN_PASSWORD_LENGTH;

  let strength: PasswordAssessment["strength"] = "empty";
  let label = "Enter a password";
  if (password.length > 0) {
    if (!acceptable) {
      strength = "weak";
      label = "Too short";
    } else if (score >= 4 || password.length >= 20) {
      strength = "strong";
      label = "Strong";
    } else if (score >= 3) {
      strength = "fair";
      label = "Good";
    } else {
      strength = "fair";
      label = "Okay";
    }
  }

  return { requirements, score, acceptable, strength, label };
}
