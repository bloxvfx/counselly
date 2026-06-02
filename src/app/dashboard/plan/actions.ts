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

// ── Categories ───────────────────────────────────────────────

export async function addCategory(data: {
  name: string;
  color: string;
}): Promise<{ error?: string; id?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { count } = await supabase
      .from("counselly_plan_categories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const { data: row, error } = await supabase
      .from("counselly_plan_categories")
      .insert({
        user_id: user.id,
        name: data.name,
        color: data.color,
        sort_order: count ?? 0,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/dashboard/plan");
    return { id: row.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateCategory(
  id: string,
  data: { name?: string; color?: string },
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_plan_categories")
      .update(data)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/plan");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_plan_categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/plan");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ── Items ─────────────────────────────────────────────────────

export async function addItem(data: {
  title: string;
  description: string;
  notes: string;
  type: string;
  status: string;
  priority: string;
  category_id: string;
  due_date: string;
  start_date: string;
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { count } = await supabase
      .from("counselly_plan_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const { error } = await supabase.from("counselly_plan_items").insert({
      user_id: user.id,
      title: data.title,
      description: data.description || null,
      notes: data.notes || null,
      type: data.type,
      status: data.status,
      priority: data.priority,
      category_id: data.category_id || null,
      due_date: data.due_date || null,
      start_date: data.start_date || null,
      sort_order: count ?? 0,
    });
    if (error) return { error: error.message };
    revalidatePath("/dashboard/plan");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateItem(
  id: string,
  data: {
    title: string;
    description: string;
    notes: string;
    type: string;
    status: string;
    priority: string;
    category_id: string;
    due_date: string;
    start_date: string;
  },
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_plan_items")
      .update({
        title: data.title,
        description: data.description || null,
        notes: data.notes || null,
        type: data.type,
        status: data.status,
        priority: data.priority,
        category_id: data.category_id || null,
        due_date: data.due_date || null,
        start_date: data.start_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/plan");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateItemStatus(
  id: string,
  status: string,
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_plan_items")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    // No revalidatePath — optimistic client state is already correct.
    // Cache updates on next full navigation.
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateItemDates(
  id: string,
  data: { start_date: string | null; due_date: string | null },
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_plan_items")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    // No revalidatePath — optimistic client state is already correct.
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteItem(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    const { error } = await supabase
      .from("counselly_plan_items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/plan");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
