"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuthUser() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Not authenticated");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function addEssay(data: {
  essay_type: string;
  college_name: string;
  prompt_label: string;
  prompt: string;
  word_limit: number | null;
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase.from("counselly_essays").insert({
      user_id: user.id,
      essay_type: data.essay_type,
      college_name: data.college_name || null,
      prompt_label: data.prompt_label || null,
      prompt: data.prompt || null,
      word_limit: data.word_limit || null,
      status: "not_started",
    });
    if (error) return { error: error.message };
    revalidatePath("/dashboard/essays");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateEssayContent(id: string, content: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const { error } = await supabase
      .from("counselly_essays")
      .update({ content, word_count: wordCount })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/essays");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateEssayStatus(id: string, status: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_essays")
      .update({ status })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/essays");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteEssay(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_essays")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/essays");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
