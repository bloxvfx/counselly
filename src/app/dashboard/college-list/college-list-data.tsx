import { requireUser } from "@/lib/supabase/cached";
import { parseCollegeListContext } from "@/lib/college-list-context";
import { CollegeListClient, type CollegeRow } from "./college-list-client";

export async function CollegeListData() {
  const { supabase, user } = await requireUser();

  const [collegesRes, profileRes] = await Promise.all([
    supabase
      .from("counselly_college_list")
      .select(
        "id, college_name, country, program, tier, status, application_deadline, portal_name",
      )
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("counselly_profiles")
      .select(
        "full_name, intended_major, financial_aid_importance, target_countries, college_type_preference, india_track, grade, board, college_list_context",
      )
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const colleges = (collegesRes.data ?? []) as CollegeRow[];
  const firstName = profileRes.data?.full_name?.split(" ")[0] ?? "there";
  const listContext = parseCollegeListContext(profileRes.data?.college_list_context);
  const initialMessages = listContext.messages ?? [];
  const profileForDiscovery = {
    intended_major: profileRes.data?.intended_major,
    financial_aid_importance: profileRes.data?.financial_aid_importance,
    target_countries: profileRes.data?.target_countries,
    college_type_preference: profileRes.data?.college_type_preference,
    india_track: profileRes.data?.india_track,
    grade: profileRes.data?.grade,
    board: profileRes.data?.board,
  };

  return (
    <CollegeListClient
      colleges={colleges}
      userName={firstName}
      listContext={listContext}
      profileForDiscovery={profileForDiscovery}
      initialMessages={initialMessages}
    />
  );
}
