"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  parseCollegeListContext,
  type StoredCollegeListMessage,
  type CollegeListContext,
} from "@/lib/college-list-context";

async function getAuthUser() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not authenticated");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function saveCollegeListMessages(
  messages: StoredCollegeListMessage[],
  contextPatch?: Partial<CollegeListContext>,
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { data: row } = await supabase
      .from("counselly_profiles")
      .select("college_list_context")
      .eq("id", user.id)
      .maybeSingle();

    const existing = parseCollegeListContext(row?.college_list_context);
    const merged: CollegeListContext = {
      ...existing,
      ...contextPatch,
      messages,
      last_updated: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("counselly_profiles")
      .update({ college_list_context: merged })
      .eq("id", user.id);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/college-list");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function addCollege(data: {
  college_name: string;
  country: string;
  program: string;
  tier: string;
  application_deadline: string;
  portal_name: string;
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { count } = await supabase
      .from("counselly_college_list")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const { error } = await supabase.from("counselly_college_list").insert({
      user_id: user.id,
      college_name: data.college_name,
      country: data.country,
      program: data.program || null,
      tier: data.tier || null,
      status: "researching",
      application_deadline: data.application_deadline || null,
      portal_name: data.portal_name || null,
      sort_order: count ?? 0,
    });
    if (error) return { error: error.message };
    revalidatePath("/dashboard/college-list");
    revalidatePath("/dashboard/timeline");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateCollegeStatus(id: string, status: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_college_list")
      .update({ status })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/college-list");
    revalidatePath("/dashboard/timeline");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function resetCollegeListSession(): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const fresh: CollegeListContext = {
      discovery_stage: "intro",
      discovery_completed: false,
      last_updated: new Date().toISOString(),
      messages: [],
    };

    const { error } = await supabase
      .from("counselly_profiles")
      .update({ college_list_context: fresh })
      .eq("id", user.id);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/college-list");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteCollege(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_college_list")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/college-list");
    revalidatePath("/dashboard/timeline");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
