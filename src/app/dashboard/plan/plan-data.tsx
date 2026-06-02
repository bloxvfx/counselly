import { createClient } from "@/lib/supabase/server";
import { PlanClient } from "./plan-client";

export type PlanCategory = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
};

export type PlanItem = {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  type: "task" | "goal" | "milestone" | "event";
  status: "not_started" | "in_progress" | "done" | "cancelled" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  due_date: string | null;
  start_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// Stale category names that should be removed
const STALE_NAMES = ["Test Prep", "Applications", "Essays", "Scholarships"];

// Desired final state — in display order
const DESIRED_CATEGORIES = [
  { name: "Extracurriculars", color: "green",  sort_order: 0 },
  { name: "Academics",        color: "blue",   sort_order: 1 },
  { name: "Tests",            color: "teal",   sort_order: 2 },
  { name: "Other",            color: "grey",   sort_order: 3 },
];

// Old names that should be renamed to match DESIRED_CATEGORIES
const RENAME_MAP: Record<string, string> = {
  Extracurricular: "Extracurriculars",
  Test: "Tests",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureCategories(supabase: any, userId: string) {
  const { data: cats } = await supabase
    .from("counselly_plan_categories")
    .select("*")
    .eq("user_id", userId);

  const existing: PlanCategory[] = cats ?? [];

  // Deduplicate: keep earliest of each name, delete the rest
  const seenNames = new Map<string, string>(); // name → id to keep
  const dupeIds: string[] = [];
  for (const cat of [...existing].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )) {
    if (seenNames.has(cat.name)) {
      dupeIds.push(cat.id);
    } else {
      seenNames.set(cat.name, cat.id);
    }
  }
  if (dupeIds.length > 0) {
    await supabase
      .from("counselly_plan_categories")
      .delete()
      .eq("user_id", userId)
      .in("id", dupeIds);
  }

  // First load — seed everything fresh
  if (existing.length === 0) {
    await supabase.from("counselly_plan_categories").insert(
      DESIRED_CATEGORIES.map((c) => ({ user_id: userId, ...c })),
    );
    return;
  }

  // Check if any stale categories exist
  const hasStale = existing.some((c) => STALE_NAMES.includes(c.name));
  if (!hasStale) {
    // Nothing to clean up — but still apply renames + colour fixes if needed
    for (const [oldName, newName] of Object.entries(RENAME_MAP)) {
      const cat = existing.find((c) => c.name === oldName);
      if (cat) {
        await supabase
          .from("counselly_plan_categories")
          .update({ name: newName })
          .eq("id", cat.id);
      }
    }
    const other = existing.find((c) => c.name === "Other");
    if (other && other.color !== "grey") {
      await supabase
        .from("counselly_plan_categories")
        .update({ color: "grey" })
        .eq("id", other.id);
    }
  } else {
    // Delete stale categories (ON DELETE SET NULL keeps items safe)
    await supabase
      .from("counselly_plan_categories")
      .delete()
      .eq("user_id", userId)
      .in("name", STALE_NAMES);

    // Apply renames
    for (const [oldName, newName] of Object.entries(RENAME_MAP)) {
      const cat = existing.find((c) => c.name === oldName);
      if (cat) {
        await supabase
          .from("counselly_plan_categories")
          .update({ name: newName })
          .eq("id", cat.id);
      }
    }

    // Fix Other colour
    const other = existing.find((c) => c.name === "Other");
    if (other) {
      await supabase
        .from("counselly_plan_categories")
        .update({ color: "grey" })
        .eq("id", other.id);
    }
  }

  // Add any desired categories that still don't exist (e.g. Academics, Tests)
  const { data: after } = await supabase
    .from("counselly_plan_categories")
    .select("name")
    .eq("user_id", userId);
  const presentNames = new Set((after ?? []).map((c: { name: string }) => c.name));

  const toAdd = DESIRED_CATEGORIES.filter((d) => !presentNames.has(d.name));
  if (toAdd.length > 0) {
    await supabase
      .from("counselly_plan_categories")
      .insert(toAdd.map((c) => ({ user_id: userId, ...c })));
  }
}

export async function PlanData() {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureCategories(supabase, user.id);

  const [categoriesRes, itemsRes] = await Promise.all([
    supabase
      .from("counselly_plan_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("counselly_plan_items")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order")
      .order("created_at"),
  ]);

  return (
    <PlanClient
      categories={(categoriesRes.data ?? []) as PlanCategory[]}
      items={(itemsRes.data ?? []) as PlanItem[]}
    />
  );
}
