import { getProfilePageData } from "./data";
import { ProfileShell } from "./profile-shell";
import type { ProfileSectionSlug } from "./sections";

export async function ProfileSectionContent({
  section,
}: {
  section: ProfileSectionSlug;
}) {
  const { profile, testScores, activities, honors, ctx, displayName, displayCycle } =
    await getProfilePageData();

  return (
    <ProfileShell
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
