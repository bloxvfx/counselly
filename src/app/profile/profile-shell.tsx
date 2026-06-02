import type { ProfileContext } from "@/types/profile-context";
import type { ProfileSectionSlug } from "./sections";
import type { ProfileData, TestScoreRow, ActivityRow, HonorRow } from "./types";
import { ProfileClient } from "./profile-client";

export function ProfileShell({
  section,
  profile,
  testScores,
  activities,
  honors,
  ctx,
  displayName,
  displayCycle,
}: {
  section: ProfileSectionSlug;
  profile: ProfileData | null;
  testScores: TestScoreRow[];
  activities: ActivityRow[];
  honors: HonorRow[];
  ctx: ProfileContext;
  displayName: string | null;
  displayCycle: string | null;
}) {
  return (
    <ProfileClient
      section={section}
      profile={profile}
      testScores={testScores}
      activities={activities}
      honors={honors}
      ctx={ctx}
      displayName={displayName}
      displayCycle={displayCycle}
    />
  );
}
