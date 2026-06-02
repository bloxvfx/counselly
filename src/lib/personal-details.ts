/** Optional profile fields not collected during onboarding. Stored in counselly_profiles.personal_details (jsonb). */

export type PersonalDetails = {
  preferred_pronouns?: string;
  gender?: string;
  date_of_birth?: string; // YYYY-MM-DD
  location?: string;
  phone?: string;
  bio?: string;
  linkedin_url?: string;
};

export const EMPTY_PERSONAL_DETAILS: PersonalDetails = {};

export const PRONOUN_OPTIONS = [
  { value: "use_name", label: "First name" },
  { value: "he_him", label: "He/him" },
  { value: "she_her", label: "She/her" },
  { value: "they_them", label: "They/them" },
  { value: "any", label: "Any" },
  { value: "prefer_not", label: "Prefer not to say" },
] as const;

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
] as const;

export function parsePersonalDetails(raw: unknown): PersonalDetails {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...EMPTY_PERSONAL_DETAILS };
  const o = raw as Record<string, unknown>;
  const str = (k: keyof PersonalDetails) => {
    const v = o[k];
    return typeof v === "string" ? v : "";
  };
  return {
    preferred_pronouns: str("preferred_pronouns"),
    gender: str("gender"),
    date_of_birth: str("date_of_birth"),
    location: str("location"),
    phone: str("phone"),
    bio: str("bio"),
    linkedin_url: str("linkedin_url"),
  };
}

export function labelForPronouns(value: string): string {
  return PRONOUN_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function labelForGender(value: string): string {
  return GENDER_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
