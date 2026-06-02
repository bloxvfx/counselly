import { getLayoutProfile } from "@/lib/supabase/cached";
import { createClient } from "@/lib/supabase/server";
import { DashboardUserMenu } from "@/components/layout/dashboard-user-menu";

const AVATAR_COLORS = [
  "#cc785c",
  "#2D7FC1",
  "#5db8a6",
  "#e8a55a",
  "#6d597a",
  "#386641",
  "#5c54a4",
  "#b76d68",
  "#22333b",
] as const;

function getDeterministicAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export async function DashboardUserFooter() {
  const { user, profile } = await getLayoutProfile();

  const isGoogle =
    user.app_metadata?.provider === "google" ||
    user.identities?.some((id) => id.provider === "google");
  const signInMethod = isGoogle ? "Google" : "Email";
  const googleAvatarUrl = isGoogle
    ? user.user_metadata?.avatar_url || user.user_metadata?.picture
    : null;

  let lernoFullName = null;
  let lernoAvatarUrl = null;

  if (!profile?.full_name?.trim() || !googleAvatarUrl) {
    const supabase = await createClient();
    if (supabase) {
      try {
        const { data: lernoProfile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        lernoFullName = lernoProfile?.full_name;
        lernoAvatarUrl = lernoProfile?.avatar_url;
      } catch (e) {
        console.error("Failed to fetch Lerno details:", e);
      }
    }
  }

  const avatarUrl = googleAvatarUrl || lernoAvatarUrl;

  const displayName =
    profile?.full_name?.trim() ||
    lernoFullName?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    user.user_metadata?.name?.trim() ||
    user.email?.split("@")[0] ||
    "You";

  const initialLetter = displayName.trim().charAt(0).toUpperCase() || "Y";

  const personalDetails =
    profile && "personal_details" in profile
      ? (profile.personal_details as { avatar_color?: string } | null)
      : null;
  const avatarBgColor =
    personalDetails?.avatar_color || getDeterministicAvatarColor(user.id);

  return (
    <div className="border-t border-hairline p-3">
      <DashboardUserMenu
        displayName={displayName}
        email={user.email ?? ""}
        avatarUrl={avatarUrl}
        initialLetter={initialLetter}
        avatarBgColor={avatarBgColor}
        signInMethod={signInMethod}
      />
    </div>
  );
}
