import { getContextProfile, requireUser } from "@/lib/supabase/cached";
import { getProfileContext } from "@/lib/profile-context";
import type { ProfileSnapshot } from "@/types/profile-context";
import { EssaysClient, type EssayRow } from "./essays-client";

export async function EssaysData() {
  const { supabase, user } = await requireUser();

  const [essaysResult, profile, collegesResult] = await Promise.all([
    supabase
      .from("counselly_essays")
      .select(
        "id, essay_type, college_name, prompt_label, prompt, word_limit, content, word_count, status",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    getContextProfile(),
    supabase
      .from("counselly_college_list")
      .select("college_name")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
  ]);

  const essays = (essaysResult.data ?? []) as EssayRow[];
  const ctx = getProfileContext(profile as ProfileSnapshot | null);
  const colleges = (collegesResult.data ?? []).map(
    (c: { college_name: string }) => c.college_name,
  );

  return (
    <EssaysClient
      essays={essays}
      colleges={colleges}
      hasUK={ctx.targetCountries.includes("UK")}
    />
  );
}
