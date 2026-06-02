export const PROFILE_SECTIONS = [
  { slug: "academics", tab: "academics", label: "Academics", shortLabel: "Academics" },
  { slug: "testing", tab: "tests", label: "Testing", shortLabel: "Testing" },
  { slug: "activities", tab: "activities", label: "Activities", shortLabel: "Activities" },
  { slug: "honors", tab: "honors", label: "Competitions & Honors", shortLabel: "Honors" },
  { slug: "personal", tab: "personal", label: "Personal Information", shortLabel: "Personal" },
] as const;

export type ProfileSectionSlug = (typeof PROFILE_SECTIONS)[number]["slug"];
export type ProfileTab = (typeof PROFILE_SECTIONS)[number]["tab"];

export const DEFAULT_PROFILE_SECTION: ProfileSectionSlug = "academics";

export function isProfileSectionSlug(value: string): value is ProfileSectionSlug {
  return PROFILE_SECTIONS.some((s) => s.slug === value);
}

export function tabForSlug(slug: ProfileSectionSlug): ProfileTab {
  return PROFILE_SECTIONS.find((s) => s.slug === slug)!.tab;
}
