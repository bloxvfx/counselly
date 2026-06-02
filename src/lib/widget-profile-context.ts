import type { SupabaseClient } from "@supabase/supabase-js";

type SectionScores = Record<string, number | string>;

interface TestScore {
  test_name: string;
  status: string;
  total_score: number | null;
  section_scores: SectionScores | null;
}

interface Activity {
  activity_type: string | null;
  position: string | null;
  description: string | null;
  is_leadership: boolean | null;
  hours_per_week: number | null;
}

interface Honor {
  title: string | null;
  level: string | null;
  status: string | null;
  year: number | null;
}

interface Essay {
  status: string | null;
}

interface CollegeEntry {
  college_name: string | null;
  tier: string | null;
  country: string | null;
}

interface Profile {
  full_name: string | null;
  grade: string | null;
  board: string | null;
  target_countries: string[] | null;
  intended_major: string | null;
  india_track: string | null;
  academic_score: number | null;
  score_type: string | null;
  application_cycle: string | null;
  financial_aid_importance: string | null;
  college_type_preference: string | null;
  help_needed: string[] | null;
}

function formatSectionScores(sections: SectionScores | null): string {
  if (!sections || typeof sections !== "object") return "";
  const parts = Object.entries(sections)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`);
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}

function bestScorePerTest(scores: TestScore[]): string[] {
  const byTest = new Map<string, TestScore>();
  for (const s of scores) {
    const existing = byTest.get(s.test_name);
    if (!existing || (s.total_score ?? 0) > (existing.total_score ?? 0)) {
      byTest.set(s.test_name, s);
    }
  }
  return Array.from(byTest.values()).map((s) => {
    const sections = formatSectionScores(s.section_scores);
    const score = s.total_score != null ? ` ${s.total_score}${sections}` : sections;
    return `- ${s.test_name}${score} (${s.status})`;
  });
}

export async function buildWidgetSystemPrompt(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<string> {
  try {
    const [profileRes, testRes, actRes, honorRes, essayRes, collegeRes] =
      await Promise.all([
        supabase
          .from("counselly_profiles")
          .select(
            "full_name, grade, board, target_countries, intended_major, india_track, academic_score, score_type, application_cycle, financial_aid_importance, college_type_preference, help_needed"
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("counselly_test_scores")
          .select("test_name, status, total_score, section_scores")
          .eq("user_id", userId),
        supabase
          .from("counselly_activities")
          .select(
            "activity_type, position, description, is_leadership, hours_per_week"
          )
          .eq("user_id", userId)
          .order("sort_order", { ascending: true })
          .limit(6),
        supabase
          .from("counselly_honors")
          .select("title, level, status, year")
          .eq("user_id", userId)
          .limit(8),
        supabase
          .from("counselly_essays")
          .select("status")
          .eq("user_id", userId),
        supabase
          .from("counselly_college_list")
          .select("college_name, tier, country")
          .eq("user_id", userId),
      ]);

    const profile = profileRes.data as Profile | null;
    const tests = (testRes.data ?? []) as TestScore[];
    const activities = (actRes.data ?? []) as Activity[];
    const honors = (honorRes.data ?? []) as Honor[];
    const essays = (essayRes.data ?? []) as Essay[];
    const colleges = (collegeRes.data ?? []) as CollegeEntry[];

    const firstName = profile?.full_name?.split(" ")[0] ?? "the student";

    const collegesByTier = {
      reach: colleges.filter((c) => c.tier === "reach").map((c) => `${c.college_name}${c.country ? ` (${c.country})` : ""}`),
      target: colleges.filter((c) => c.tier === "target").map((c) => `${c.college_name}${c.country ? ` (${c.country})` : ""}`),
      safety: colleges.filter((c) => c.tier === "safety").map((c) => `${c.college_name}${c.country ? ` (${c.country})` : ""}`),
    };

    const essayCounts = {
      notStarted: essays.filter((e) => e.status === "not_started").length,
      inProgress: essays.filter((e) =>
        ["brainstorming", "drafting", "revising"].includes(e.status ?? "")
      ).length,
      final: essays.filter((e) => e.status === "final").length,
    };

    const lines: (string | null)[] = [
      `You are Counselly, a warm and expert AI college counselling assistant for ${firstName}, an Indian student applying to universities.`,
      "",
      "You are integrated as a floating chat widget — keep all responses concise, actionable, and easy to scan. Use bullet points for lists. Never pad with filler. End each response with one clear next step or follow-up question.",
      "Use Indian student context where relevant: CBSE, ISC, JEE, NEET, UCAS, Common App, study abroad visa requirements. Be realistic but encouraging — think like a senior admissions counsellor.",
      "",
      "## Student Profile",
      profile?.full_name ? `- Name: ${profile.full_name}` : null,
      profile?.grade ? `- Grade: ${profile.grade}` : null,
      profile?.board ? `- Board: ${profile.board}` : null,
      profile?.application_cycle ? `- Application Cycle: ${profile.application_cycle}` : null,
      profile?.target_countries?.length ? `- Target Countries: ${profile.target_countries.join(", ")}` : null,
      profile?.intended_major ? `- Intended Major: ${profile.intended_major}` : null,
      profile?.india_track ? `- India Track: ${profile.india_track}` : null,
      profile?.academic_score != null
        ? `- Academic Score: ${profile.academic_score}${profile.score_type ? ` (${profile.score_type})` : ""}`
        : null,
      profile?.financial_aid_importance ? `- Financial Aid: ${profile.financial_aid_importance}` : null,
      profile?.college_type_preference ? `- College Preference: ${profile.college_type_preference}` : null,
      profile?.help_needed?.length ? `- Needs help with: ${profile.help_needed.join(", ")}` : null,
    ];

    if (tests.length > 0) {
      lines.push("", "## Test Scores");
      for (const line of bestScorePerTest(tests)) lines.push(line);
    }

    if (activities.length > 0) {
      lines.push("", "## Activities");
      for (const a of activities) {
        const label = [
          a.activity_type ?? "Activity",
          a.position ? `— ${a.position}` : null,
          a.hours_per_week ? `(${a.hours_per_week} hrs/wk)` : null,
          a.is_leadership ? "[Leadership]" : null,
        ]
          .filter(Boolean)
          .join(" ");
        lines.push(`- ${label}`);
      }
    }

    if (honors.length > 0) {
      lines.push("", "## Honours & Awards");
      for (const h of honors) {
        const label = [
          h.title,
          h.level ? `— ${h.level}` : null,
          h.year ? `(${h.year})` : null,
        ]
          .filter(Boolean)
          .join(" ");
        lines.push(`- ${label}`);
      }
    }

    if (colleges.length > 0) {
      lines.push("", "## College List");
      if (collegesByTier.reach.length > 0)
        lines.push(`- Reach: ${collegesByTier.reach.join(", ")}`);
      if (collegesByTier.target.length > 0)
        lines.push(`- Target: ${collegesByTier.target.join(", ")}`);
      if (collegesByTier.safety.length > 0)
        lines.push(`- Safety: ${collegesByTier.safety.join(", ")}`);
    } else {
      lines.push("", "## College List", "- No colleges added yet.");
    }

    if (essays.length > 0) {
      lines.push("", "## Essays");
      if (essayCounts.final > 0) lines.push(`- ${essayCounts.final} finalised`);
      if (essayCounts.inProgress > 0) lines.push(`- ${essayCounts.inProgress} in progress`);
      if (essayCounts.notStarted > 0) lines.push(`- ${essayCounts.notStarted} not started`);
    }

    return lines.filter((l) => l !== null).join("\n");
  } catch {
    return "You are Counselly, an AI college counsellor. Be concise and helpful.";
  }
}
