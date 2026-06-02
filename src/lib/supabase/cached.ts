import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { NextStepFlags } from "@/lib/dashboard/next-steps";

/** Auth + Supabase client — deduped once per request. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  if (!supabase) redirect("/auth");

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth");

  return { supabase, user };
});

const LAYOUT_PROFILE_BASE =
  "onboarding_completed, full_name, target_countries, intended_major, board, help_needed";

/** Onboarding gate — same columns as `/onboarding` so redirects never disagree. */
export const getOnboardingStatus = cache(async () => {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("counselly_profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[counselly] onboarding status:", error.message);
  }

  return {
    user,
    supabase,
    onboardingCompleted: data?.onboarding_completed === true,
  };
});

/** Minimal profile for sidebar nav (after onboarding is confirmed). */
export const getLayoutProfile = cache(async () => {
  const { user, supabase, onboardingCompleted } = await getOnboardingStatus();

  if (!onboardingCompleted) redirect("/onboarding");

  const { data: profile, error } = await supabase
    .from("counselly_profiles")
    .select(`${LAYOUT_PROFILE_BASE}, india_track, personal_details`)
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    const { data: fallback } = await supabase
      .from("counselly_profiles")
      .select(LAYOUT_PROFILE_BASE)
      .eq("id", user.id)
      .maybeSingle();

    if (fallback) {
      return { user, profile: fallback };
    }

    if (error) {
      console.error("[counselly] layout profile:", error.message);
    }

    // Onboarding is done but extended columns failed — do not bounce to /onboarding (loop).
    return {
      user,
      profile: {
        onboarding_completed: true,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        target_countries: null,
        intended_major: null,
        board: null,
        help_needed: null,
      },
    };
  }

  return { user, profile };
});

/** Checklist progress for sidebar next steps. */
export const getChecklistProgress = cache(async (): Promise<NextStepFlags> => {
  const { supabase, user } = await requireUser();

  const { data: profile, error: profileError } = await supabase
    .from("counselly_profiles")
    .select("academic_score, tests_taken, subject_scores")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[counselly] checklist profile:", profileError.message);
  }

  const [
    activitiesResult,
    testScoresResult,
    honorsResult,
    collegeListResult,
    planItemsResult,
  ] = await Promise.all([
    supabase
      .from("counselly_activities")
      .select("id")
      .eq("user_id", user.id)
      .limit(1),
    supabase
      .from("counselly_test_scores")
      .select("id")
      .eq("user_id", user.id)
      .limit(1),
    supabase
      .from("counselly_honors")
      .select("id")
      .eq("user_id", user.id)
      .limit(1),
    supabase
      .from("counselly_college_list")
      .select("id")
      .eq("user_id", user.id)
      .limit(1),
    supabase
      .from("counselly_plan_items")
      .select("id")
      .eq("user_id", user.id)
      .limit(1),
  ]);

  if (activitiesResult.error) {
    console.error("[counselly] checklist activities:", activitiesResult.error.message);
  }
  if (testScoresResult.error) {
    console.error("[counselly] checklist tests:", testScoresResult.error.message);
  }
  if (honorsResult.error) {
    console.error("[counselly] checklist honors:", honorsResult.error.message);
  }
  if (collegeListResult.error) {
    console.error(
      "[counselly] checklist college list:",
      collegeListResult.error.message,
    );
  }
  if (planItemsResult.error) {
    console.error("[counselly] checklist plan:", planItemsResult.error.message);
  }

  const hasSubjectScores =
    !!profile?.subject_scores &&
    Object.keys(profile.subject_scores as Record<string, unknown>).length > 0;

  return {
    hasAcademics: !!profile?.academic_score || hasSubjectScores,
    hasActivities: (activitiesResult.data?.length ?? 0) > 0,
    hasTests:
      (testScoresResult.data?.length ?? 0) > 0 ||
      (profile?.tests_taken ?? []).length > 0,
    hasHonors: (honorsResult.data?.length ?? 0) > 0,
    hasCollegeList: (collegeListResult.data?.length ?? 0) > 0,
    hasPlan: (planItemsResult.data?.length ?? 0) > 0,
  };
});

const CONTEXT_PROFILE_SELECT = "target_countries, help_needed";

/** Profile fields for relevance / sorting — deduped across Suspense siblings. */
export const getContextProfile = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("counselly_profiles")
    .select(CONTEXT_PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();
  return data;
});

/** Lerno avatar — optional; never block the shell on this. */
export const getLernoAvatarUrl = cache(async (userId: string) => {
  const { supabase } = await requireUser();

  try {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .maybeSingle();
    return data?.avatar_url ?? null;
  } catch {
    return null;
  }
});
