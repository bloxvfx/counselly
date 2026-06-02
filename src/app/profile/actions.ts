"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { PersonalDetails } from "@/lib/personal-details";

async function getAuthUser() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not authenticated");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function revalidate() {
  revalidatePath("/profile", "layout");
  revalidatePath("/dashboard");
}

function trimOptionalDetails(data: PersonalDetails): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function updatePersonalDetails(
  data: PersonalDetails,
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_profiles")
      .update({ personal_details: trimOptionalDetails(data) })
      .eq("id", user.id);
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateBasics(data: {
  full_name: string;
  grade: string;
  board: string;
  target_countries: string[];
  intended_major: string;
  financial_aid_importance: string;
  help_needed: string[];
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_profiles")
      .update(data)
      .eq("id", user.id);
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateAcademics(data: {
  academic_score: string;
  score_type: string;
  subject_scores: Record<string, string>;
  predicted_grades: Record<string, string>;
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_profiles")
      .update({
        academic_score: data.academic_score || null,
        score_type: data.score_type || "percentage",
        subject_scores: Object.keys(data.subject_scores).length > 0 ? data.subject_scores : null,
        predicted_grades: Object.keys(data.predicted_grades).length > 0 ? data.predicted_grades : null,
      })
      .eq("id", user.id);
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─── Grade-based academics ────────────────────────────────────────────────────

type SubjectEntry = { name: string; score: string; max: string };
type GradeEntry = { class_size: string; class_rank: string; subjects: SubjectEntry[] };

export async function saveEducationInfo(data: {
  school_name: string;
  board: string;
  grade: string;
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    // Preserve existing grade data in subject_scores JSONB
    const { data: profile } = await supabase
      .from("counselly_profiles")
      .select("subject_scores")
      .eq("id", user.id)
      .maybeSingle();
    const existing = (profile?.subject_scores as Record<string, unknown>) ?? {};
    const updated = { ...existing, _v: 2, school_name: data.school_name };
    const { error } = await supabase
      .from("counselly_profiles")
      .update({ board: data.board, grade: data.grade, subject_scores: updated })
      .eq("id", user.id);
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function saveGradeData(gradeKey: string, data: GradeEntry): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { data: profile } = await supabase
      .from("counselly_profiles")
      .select("subject_scores")
      .eq("id", user.id)
      .maybeSingle();
    const existing = (profile?.subject_scores as Record<string, unknown>) ?? {};
    const updated = { ...existing, _v: 2, [gradeKey]: data };

    // Auto-compute overall academic_score as average across all entered subjects
    const gradeKeys = ["9", "10", "11", "12"];
    const allSubjects = gradeKeys
      .flatMap(g => ((updated[g] as GradeEntry | undefined)?.subjects ?? []))
      .filter(s => s.score && s.max && !isNaN(parseFloat(s.score)) && !isNaN(parseFloat(s.max)) && parseFloat(s.max) > 0);
    const overallAvg = allSubjects.length > 0
      ? allSubjects.reduce((sum, s) => sum + (parseFloat(s.score) / parseFloat(s.max)) * 100, 0) / allSubjects.length
      : null;

    const { error } = await supabase
      .from("counselly_profiles")
      .update({
        subject_scores: updated,
        ...(overallAvg !== null ? { academic_score: overallAvg.toFixed(1) } : {}),
      })
      .eq("id", user.id);
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function savePredictedGrades(
  rows: Array<{ subject: string; grade: string }>
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const predicted = Object.fromEntries(
      rows.filter(r => r.subject.trim() && r.grade.trim()).map(r => [r.subject.trim(), r.grade.trim()])
    );
    const { error } = await supabase
      .from("counselly_profiles")
      .update({ predicted_grades: Object.keys(predicted).length > 0 ? predicted : null })
      .eq("id", user.id);
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function addTestScore(data: {
  test_name: string;
  status: string;
  total_score: string;
  test_date: string;
  planned_date: string;
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase.from("counselly_test_scores").insert({
      user_id: user.id,
      test_name: data.test_name,
      status: data.status,
      total_score: data.total_score || null,
      test_date: data.test_date || null,
      planned_date: data.planned_date || null,
    });
    if (error) return { error: error.message };

    // Sync legacy tests_taken array for context calculations
    const { data: profile } = await supabase
      .from("counselly_profiles")
      .select("tests_taken")
      .eq("id", user.id)
      .maybeSingle();
    const current = (profile?.tests_taken as string[]) ?? [];
    if (!current.includes(data.test_name)) {
      await supabase
        .from("counselly_profiles")
        .update({ tests_taken: [...current, data.test_name] })
        .eq("id", user.id);
    }

    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteTestScore(id: string, testName: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_test_scores")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };

    // Remove from legacy tests_taken if no remaining rows for this test
    const { count } = await supabase
      .from("counselly_test_scores")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("test_name", testName);
    if (count === 0) {
      const { data: profile } = await supabase
        .from("counselly_profiles")
        .select("tests_taken")
        .eq("id", user.id)
        .maybeSingle();
      await supabase
        .from("counselly_profiles")
        .update({ tests_taken: ((profile?.tests_taken as string[]) ?? []).filter(t => t !== testName) })
        .eq("id", user.id);
    }

    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateTestScore(id: string, data: {
  test_name: string;
  status: string;
  total_score: string;
  test_date: string;
  planned_date: string;
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_test_scores")
      .update({
        test_name: data.test_name,
        status: data.status,
        total_score: data.total_score || null,
        test_date: data.test_date || null,
        planned_date: data.planned_date || null,
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function addActivity(data: {
  activity_type: string;
  name: string;
  organization: string;
  position: string;
  description: string;
  is_leadership: boolean;
  hours_per_week: number | null;
  weeks_per_year: number | null;
  grade_9: boolean;
  grade_10: boolean;
  grade_11: boolean;
  grade_12: boolean;
  continued_in_college: boolean;
  status: string;
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { count } = await supabase
      .from("counselly_activities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { error } = await supabase.from("counselly_activities").insert({
      user_id: user.id,
      sort_order: count ?? 0,
      ...data,
      organization: data.organization || null,
      position: data.position || null,
      description: data.description || null,
      hours_per_week: data.hours_per_week || null,
      weeks_per_year: data.weeks_per_year || null,
    });
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteActivity(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_activities")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateActivity(id: string, data: {
  activity_type: string;
  name: string;
  organization: string;
  position: string;
  description: string;
  is_leadership: boolean;
  hours_per_week: number | null;
  weeks_per_year: number | null;
  grade_9: boolean;
  grade_10: boolean;
  grade_11: boolean;
  grade_12: boolean;
  continued_in_college: boolean;
  status: string;
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_activities")
      .update({
        ...data,
        organization: data.organization || null,
        position: data.position || null,
        description: data.description || null,
        hours_per_week: data.hours_per_week || null,
        weeks_per_year: data.weeks_per_year || null,
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function reorderActivities(
  items: { id: string; sort_order: number }[]
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    await Promise.all(
      items.map(({ id, sort_order }) =>
        supabase
          .from("counselly_activities")
          .update({ sort_order })
          .eq("id", id)
          .eq("user_id", user.id)
      )
    );
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function addHonor(data: {
  title: string;
  field: string;
  issuing_org: string;
  level: string;
  recognition_level: string;
  year: string;
  grade: string;
  status: string;
  award: string;
  description: string;
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { count } = await supabase
      .from("counselly_honors")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const { error } = await supabase.from("counselly_honors").insert({
      user_id: user.id,
      sort_order: count ?? 0,
      title: data.title,
      field: data.field || null,
      issuing_org: data.issuing_org || null,
      level: data.level || null,
      recognition_level: data.recognition_level || null,
      year: data.year || null,
      grade: data.grade || null,
      status: data.status || "participated",
      award: data.award || null,
      description: data.description || null,
    });
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateHonor(id: string, data: {
  title: string;
  field: string;
  issuing_org: string;
  level: string;
  recognition_level: string;
  year: string;
  grade: string;
  status: string;
  award: string;
  description: string;
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_honors")
      .update({
        title: data.title,
        field: data.field || null,
        issuing_org: data.issuing_org || null,
        level: data.level || null,
        recognition_level: data.recognition_level || null,
        year: data.year || null,
        grade: data.grade || null,
        status: data.status || "participated",
        award: data.award || null,
        description: data.description || null,
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteHonor(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_honors")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function reorderHonors(
  items: { id: string; sort_order: number }[]
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    await Promise.all(
      items.map(({ id, sort_order }) =>
        supabase
          .from("counselly_honors")
          .update({ sort_order })
          .eq("id", id)
          .eq("user_id", user.id)
      )
    );
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
