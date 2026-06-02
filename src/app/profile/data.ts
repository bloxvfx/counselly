import { cache } from "react";
import { requireUser } from "@/lib/supabase/cached";
import { getProfileContext } from "@/lib/profile-context";
import { resolveApplicationCycle, resolveDisplayName } from "@/lib/profile-display";
import type { ProfileSnapshot } from "@/types/profile-context";
import type { ProfileData, TestScoreRow, ActivityRow, HonorRow } from "./types";

export const getProfilePageData = cache(async () => {
  const { supabase, user } = await requireUser();

  const profileColumns =
    "full_name, personal_details, grade, board, target_countries, intended_major, india_track, academic_score, score_type, subject_scores, predicted_grades, tests_taken, application_cycle, financial_aid_importance, help_needed";
  const profileColumnsLegacy = profileColumns.replace(", personal_details", "");

  const profilePromise = supabase
    .from("counselly_profiles")
    .select(profileColumns)
    .eq("id", user.id)
    .maybeSingle();

  const [profileResult, testScoresResult, activitiesResult, honorsResult] = await Promise.all([
    profilePromise,
    supabase
      .from("counselly_test_scores")
      .select(
        "id, test_name, status, total_score, test_date, planned_date, attempt_number",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("counselly_activities")
      .select(
        "id, activity_type, name, organization, position, description, is_leadership, hours_per_week, weeks_per_year, grade_9, grade_10, grade_11, grade_12, continued_in_college, sort_order",
      )
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("counselly_honors")
      .select(
        "id, title, field, issuing_org, level, recognition_level, year, grade, status, award, description, sort_order",
      )
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
  ]);

  let profile = profileResult.data as ProfileData | null;
  if (profileResult.error && profileResult.error.message.includes("personal_details")) {
    const { data } = await supabase
      .from("counselly_profiles")
      .select(profileColumnsLegacy)
      .eq("id", user.id)
      .maybeSingle();
    profile = data as ProfileData | null;
  }
  const testScores = (testScoresResult.data ?? []) as TestScoreRow[];
  const activities = (activitiesResult.data ?? []) as ActivityRow[];
  const honors = (honorsResult.data ?? []) as HonorRow[];
  const ctx = getProfileContext(profile as ProfileSnapshot | null);

  const displayName = resolveDisplayName(profile, user);
  const displayCycle = resolveApplicationCycle(profile);

  return { profile, testScores, activities, honors, ctx, displayName, displayCycle };
});
