/** Display helpers for profile fields — fallbacks when DB values are missing. */

export function calculateApplicationCycle(grade: string): string {
  if (grade === "12" || grade === "gap_year") return "2026-27";
  if (grade === "11") return "2027-28";
  if (grade === "10") return "2028-29";
  if (grade === "9") return "2029-30";
  if (grade === "applied") return "applied";
  return "unsure";
}

export function formatApplicationCycle(cycle: string): string {
  if (cycle === "applied") return "Applied";
  if (cycle === "unsure") return "Unsure";
  const m = cycle.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const start = parseInt(m[1], 10);
    return `${start}/${start + 1}`;
  }
  return cycle;
}

type AuthUserLike = {
  user_metadata?: Record<string, unknown>;
  email?: string | null;
};

type ProfileLike = {
  full_name?: string | null;
  application_cycle?: string | null;
  grade?: string | null;
} | null;

export function resolveDisplayName(
  profile: ProfileLike,
  user: AuthUserLike,
): string | null {
  const fromProfile = profile?.full_name?.trim();
  if (fromProfile) return fromProfile;

  const meta = user.user_metadata;
  if (typeof meta?.full_name === "string" && meta.full_name.trim()) {
    return meta.full_name.trim();
  }
  if (typeof meta?.name === "string" && meta.name.trim()) {
    return meta.name.trim();
  }

  return null;
}

export function resolveApplicationCycle(profile: ProfileLike): string | null {
  const fromDb = profile?.application_cycle?.trim();
  if (fromDb) return formatApplicationCycle(fromDb);

  const grade = profile?.grade?.trim();
  if (grade) return formatApplicationCycle(calculateApplicationCycle(grade));

  return null;
}
