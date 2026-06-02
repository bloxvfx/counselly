import { createClient } from "@/lib/supabase/server";
import { webSearch, formatSearchResults } from "@/lib/search";
import { searchCollegesForAI, fetchRecommendationPool, formatRecommendationPoolForPrompt, programsFromStudyField, enrichRecommendationsFromDb } from "@/lib/colleges-db";
import {
  parseCollegeListContext,
  getNextDiscoveryQuestion,
  buildRecommendationRequirementsText,
  resolveTargetCountries,
  validateRecommendationBatch,
  countriesMatch,
  type CollegeListContext,
  type CollegeRecommendation,
  type ProfileForDiscovery,
} from "@/lib/college-list-context";

const MODEL = "gemini-2.5-flash";
const AUTO_START_TOKEN = "[BEGIN_COLLEGE_LIST_SESSION]";

function getGeminiEndpoint(project: string, region: string) {
  return (
    `https://${region}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${region}/publishers/google/models/${MODEL}:generateContent`
  );
}

type SearchSource = "web" | "database";

type SSEEvent =
  | { type: "status"; icon: string; text: string }
  | { type: "search_start"; id: string; source: SearchSource; query: string }
  | {
      type: "search";
      id: string;
      source: SearchSource;
      query: string;
      total: number;
      results: Array<{ title: string; url: string; snippet?: string }>;
    }
  | { type: "text"; delta: string }
  | { type: "action"; text: string; success: boolean }
  | { type: "question"; question: string; options: string[]; allowMultiple?: boolean }
  | { type: "recommendations"; colleges: CollegeRecommendation[] }
  | { type: "stage"; stage: string }
  | { type: "done" };

const sseEncoder = new TextEncoder();

function encodeEvent(event: SSEEvent): Uint8Array {
  return sseEncoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildCollegeListSystemPrompt(userId: string, supabase: any): Promise<string> {
  const [profileRes, testRes, actRes, honorRes, collegeRes] = await Promise.all([
    supabase
      .from("counselly_profiles")
      .select(
        "full_name, grade, board, target_countries, intended_major, india_track, academic_score, score_type, subject_scores, predicted_grades, application_cycle, financial_aid_importance, college_type_preference, help_needed, college_list_context, language_proficiency, language_test_taken, language_test_score",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("counselly_test_scores")
      .select("test_name, status, total_score, section_scores")
      .eq("user_id", userId),
    supabase
      .from("counselly_activities")
      .select("name, activity_type, position, is_leadership, hours_per_week")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .limit(8),
    supabase
      .from("counselly_honors")
      .select("title, level, year, status")
      .eq("user_id", userId)
      .limit(8),
    supabase
      .from("counselly_college_list")
      .select("college_name, country, program, tier, status")
      .eq("user_id", userId),
  ]);

  const profile = profileRes.data;
  const tests = testRes.data ?? [];
  const activities = actRes.data ?? [];
  const honors = honorRes.data ?? [];
  const colleges = collegeRes.data ?? [];
  const listContext = parseCollegeListContext(profile?.college_list_context);

  const firstName = profile?.full_name?.split(" ")[0] ?? "the student";

  const lines: string[] = [
    `You are Counselly's College List Builder — an expert admissions counsellor guiding ${firstName} (an Indian student) to build a personalised, honest college shortlist.`,
    "",
    "## Your Mission",
    "Lead a guided discovery session. The student should NOT have to figure out what to ask — YOU drive the conversation.",
    "Ask ONE focused multiple-choice question at a time using ask_clarifying_question until you have enough context.",
    "Then research and recommend colleges with honest reach/target/safety classifications.",
    "",
    "## CRITICAL: How to Ask Questions",
    "- NEVER ask a question in plain text. The student sees tappable option buttons ONLY when you call ask_clarifying_question.",
    "- Keep any welcome/intro text to 1–2 short sentences, then IMMEDIATELY call ask_clarifying_question in the same turn.",
    "- Do not end a turn with an unanswered question in text — always use the tool.",
    "- Each ask_clarifying_question must have 2–6 clear, tappable options including 'Not sure yet' when appropriate.",
    "- The UI also lets students type a custom answer below the options — options should cover common cases, not every possibility.",
    "",
    "## Rules for Honesty",
    "- Be direct about reach schools — never oversell chances",
    "- Explain WHY each school fits or doesn't fit THIS student's profile",
    "- If their profile is weak for a dream school, say so kindly but clearly",
    "- Distinguish between 'good school' and 'good fit for you'",
    "- For India JEE/NEET tracks, include exam-cutoff tier colleges where relevant",
    "",
    "## Question Strategy — PERSONALISE, never ask irrelevant options",
    "- If intended_major is set (e.g. Engineering & CS), NEVER offer Arts, Humanities, Medicine, etc. as options.",
    "- Ask major-SPECIFIC follow-ups (e.g. CS focus: AI, software, ECE) — not generic 'what do you want to study'.",
    "- Skip financial aid questions if already answered in onboarding — refine instead.",
    "- Use target_countries from profile when asking location questions.",
    "- Set allow_multiple: true for priorities, location preferences, and 'choose all that apply' questions.",
    "- Use INR and lakh/crore for any budget or cost figures — never USD. Audience is Indian students.",
    "- Skip any topic already in college_list_context or visible in conversation history.",
    "- Ask at most 7 preference questions total, then move to recommendations. The question flow is: study focus → career direction → budget → placement importance → learning environment → priorities → post-grad plan.",
    "- NEVER ask urban/suburban/rural/campus setting/environment questions — treat onboarding college_type_preference as sufficient.",
    "- NEVER ask campus size unless the student brings it up.",
    "- If the student answered 'No preference', 'Not sure', or similar, treat that topic as closed — do not re-ask in different wording.",
    "- Do not ask overlapping questions (e.g. country focus AND city type AND campus vibe). One location question is enough.",
    "- Once you have study focus, budget/aid, and top priorities, call suggest_colleges — do not keep probing.",
    "",
    "## Continuing sessions (critical)",
    "- If conversation history exists, NEVER repeat welcome, hello, or intro text.",
    "- Do not say 'great to help you build your college list' again — the student already started.",
    "- Jump straight to ask_clarifying_question with zero or one short transition word (e.g. 'Next:' or skip entirely).",
    "- If enough preferences are gathered, call suggest_colleges instead of another question.",
    "",
    "## Workflow",
    "1. **intro**: Warm welcome referencing their profile. Ask first missing question via ask_clarifying_question.",
    "2. **preferences**: Continue MCQs until budget, scholarships, study field, and priorities are clear. Call save_list_preferences after each answer.",
    "3. **recommendations**: Query counselly_colleges via search_college_database, then suggest_colleges with **10–14 schools** across tiers and target countries.",
    "4. **refine**: Help adjust — add/remove, explain trade-offs, answer follow-ups.",
    "Call update_discovery_stage when moving between phases.",
    "",
    "## Tool Guidelines",
    "- ask_clarifying_question: ONE question, 2–6 personalised options. Set allow_multiple: true when student should pick multiple (priorities, locations).",
    "- web_search: Scholarship deadlines, application news, recent policy changes, or context that is not in counselly_colleges. **Always include the student's target countries in your query** — never search globally for general discovery (e.g. use 'top CS programs in USA UK Canada', not 'top CS programs worldwide').",
    "- search_college_database: Verified college stats from counselly_colleges. **Always pass the student's target countries in the countries filter** for any discovery search. Only omit countries when looking up a specific college by name.",
    "- Use whichever source fits best — web for fresh news, database for verified college facts. You may use both in the same turn.",
    "- suggest_colleges: **Only** colleges that exist in counselly_colleges — use exact names from search_college_database or the provided shortlist",
    "- add_college: When student explicitly confirms adding a school",
    "- save_list_preferences: Persist answers to college_list_context",
    "",
    "## Student Profile",
  ];

  if (profile) {
    if (profile.full_name) lines.push(`- **Name:** ${profile.full_name}`);
    if (profile.grade) lines.push(`- **Grade:** ${profile.grade}`);
    if (profile.board) lines.push(`- **Board:** ${profile.board}`);
    if (profile.application_cycle) lines.push(`- **Cycle:** ${profile.application_cycle}`);
    if (profile.target_countries?.length) {
      lines.push(`- **Target Countries:** ${profile.target_countries.join(", ")}`);
    }
    if (profile.intended_major) lines.push(`- **Intended Major:** ${profile.intended_major}`);
    if (profile.india_track) lines.push(`- **India Track:** ${profile.india_track}`);
    if (profile.academic_score) {
      const scoreLabel =
        profile.score_type === "percentage"
          ? `${profile.academic_score}%`
          : `${profile.academic_score} (${profile.score_type})`;
      lines.push(`- **Academic Score:** ${scoreLabel}`);
    }
    if (profile.financial_aid_importance) {
      lines.push(`- **Financial Aid (onboarding):** ${profile.financial_aid_importance}`);
    }
    if (profile.college_type_preference?.length) {
      lines.push(`- **College Type Pref:** ${profile.college_type_preference.join(", ")}`);
      lines.push(
        "- **Campus environment is already known from onboarding — do NOT ask urban/suburban/rural questions.**",
      );
    }
  }

  if (Object.keys(listContext).length > 0) {
    lines.push("", "## College List Discovery (already gathered)");
    for (const [key, value] of Object.entries(listContext)) {
      if (
        value !== undefined &&
        value !== null &&
        key !== "last_updated" &&
        key !== "messages"
      ) {
        lines.push(`- **${key}:** ${Array.isArray(value) ? value.join(", ") : String(value)}`);
      }
    }
    if (listContext.messages?.length) {
      lines.push("", "## Conversation so far (do not repeat answered questions)");
      for (const msg of listContext.messages.slice(-12)) {
        if (msg.role === "user") {
          lines.push(`- Student: ${msg.content}`);
        } else if (msg.content) {
          lines.push(`- Counsellor: ${msg.content.slice(0, 200)}${msg.content.length > 200 ? "…" : ""}`);
        }
        if (msg.question?.answeredWith !== undefined) {
          const ans = Array.isArray(msg.question.answeredWith)
            ? msg.question.answeredWith.join(", ")
            : msg.question.answeredWith;
          lines.push(`  → Answered: ${ans}`);
        }
      }
    }
  }

  if (tests.length > 0) {
    lines.push("", "## Test Scores");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const t of tests as any[]) {
      lines.push(`- **${t.test_name}:** ${t.total_score ?? "planned"} (${t.status})`);
    }
  }

  if (activities.length > 0) {
    lines.push("", "## Activities");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of activities as any[]) {
      lines.push(`- ${a.name ?? a.activity_type}${a.is_leadership ? " (Leadership)" : ""}`);
    }
  }

  if (honors.length > 0) {
    lines.push("", "## Honors");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const h of honors as any[]) {
      lines.push(`- ${h.title} (${h.level ?? ""})`);
    }
  }

  lines.push("", "## Current College List");
  if (colleges.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of colleges as any[]) {
      lines.push(`- ${c.college_name} (${c.country}) — ${c.tier ?? "uncategorised"}`);
    }
  } else {
    lines.push("- Empty — help them build from scratch.");
  }

  lines.push("", buildRecommendationRequirementsText(profileForDiscoveryFromProfile(profile), listContext));

  return lines.join("\n");
}

function profileForDiscoveryFromProfile(
  profile: {
    intended_major?: string | null;
    financial_aid_importance?: string | null;
    target_countries?: string[] | null;
    college_type_preference?: string[] | null;
    india_track?: string | null;
    grade?: string | null;
    board?: string | null;
  } | null,
): ProfileForDiscovery {
  if (!profile) return {};
  return {
    intended_major: profile.intended_major,
    financial_aid_importance: profile.financial_aid_importance,
    target_countries: profile.target_countries,
    college_type_preference: profile.college_type_preference,
    india_track: profile.india_track,
    grade: profile.grade,
    board: profile.board,
  };
}

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "web_search",
        description:
          "Search the web for scholarship deadlines, application news, recent policy changes, or supplemental context. Prefer search_college_database for verified acceptance rates, tuition, and rankings — but use web when fresher or broader context helps.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" },
            num_results: { type: "number" },
          },
          required: ["query"],
        },
      },
      {
        name: "ask_clarifying_question",
        description: "Ask ONE personalised multiple-choice question. Options must match the student's onboarding major and target countries — never irrelevant fields.",
        parameters: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            allow_multiple: {
              type: "boolean",
              description: "True when student should select multiple options (e.g. priorities, locations)",
            },
          },
          required: ["question", "options"],
        },
      },
      {
        name: "save_list_preferences",
        description: "Save gathered preferences to the student's college list context.",
        parameters: {
          type: "object",
          properties: {
            budget_constraint: { type: "string", description: "strict | moderate | flexible | unsure" },
            scholarship_need: { type: "string", description: "essential | helpful | not_needed" },
            annual_budget_inr: { type: "string", description: "Annual budget in INR, e.g. ₹25–40 lakh/year" },
            campus_size: { type: "string", description: "small | medium | large | no_preference" },
            campus_setting: { type: "string", description: "urban | suburban | rural | no_preference" },
            colleges_in_mind: { type: "array", items: { type: "string" } },
            study_field: { type: "string" },
            study_field_decided: { type: "boolean" },
            priorities: { type: "array", items: { type: "string" } },
            location_preferences: { type: "array", items: { type: "string" } },
            notes: { type: "string" },
          },
        },
      },
      {
        name: "update_discovery_stage",
        description: "Update the discovery workflow stage.",
        parameters: {
          type: "object",
          properties: {
            stage: {
              type: "string",
              description: "intro | preferences | recommendations | refine | complete",
            },
          },
          required: ["stage"],
        },
      },
      {
        name: "suggest_colleges",
        description:
          "Present structured college recommendations from counselly_colleges ONLY. MUST return 10–14 schools with exact DB names. ~40% reach, ~45% target, 2–3 safety.",
        parameters: {
          type: "object",
          properties: {
            colleges: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  college_name: { type: "string" },
                  country: { type: "string" },
                  tier: { type: "string", description: "reach | target | safety | exam-cutoff" },
                  program: { type: "string" },
                  fit_summary: { type: "string", description: "Why this fits the student (1-2 sentences)" },
                  honest_assessment: { type: "string", description: "Realistic admission outlook" },
                  key_facts: { type: "string", description: "Acceptance rate, cost, or key stat if known" },
                },
                required: ["college_name", "country", "tier", "fit_summary", "honest_assessment"],
              },
            },
          },
          required: ["colleges"],
        },
      },
      {
        name: "add_college",
        description: "Add a college to the student's saved list when they confirm.",
        parameters: {
          type: "object",
          properties: {
            college_name: { type: "string" },
            country: { type: "string" },
            tier: { type: "string" },
            program: { type: "string" },
          },
          required: ["college_name", "country", "tier"],
        },
      },
      {
        name: "search_college_database",
        description:
          "Query counselly_colleges — Counselly's verified college database (~1000 schools). REQUIRED for acceptance rates, costs, SAT/ACT ranges, QS rankings, programs, and aid. Always use this before suggest_colleges.",
        parameters: {
          type: "object",
          properties: {
            name_query: {
              type: "string",
              description: "Partial college name to search for (e.g. 'MIT', 'Toronto')",
            },
            countries: {
              type: "array",
              items: { type: "string" },
              description: "Filter by countries: 'USA', 'UK', 'Canada', 'Australia', 'Singapore', 'Germany', etc.",
            },
            programs: {
              type: "array",
              items: { type: "string" },
              description: "Filter by strong programs, e.g. ['Computer Science', 'Engineering', 'Business']",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Filter by tags: 'ivy-league', 'need-blind-intl', 'stem-heavy', 'liberal-arts', 'test-optional', etc.",
            },
            max_acceptance_rate: {
              type: "number",
              description: "Maximum acceptance rate in percent (e.g. 20 means ≤ 20%)",
            },
            min_acceptance_rate: {
              type: "number",
              description: "Minimum acceptance rate in percent (e.g. 50 means ≥ 50% for safety schools)",
            },
            intl_financial_aid: {
              type: "boolean",
              description: "If true, only return colleges that award financial aid to international students",
            },
            limit: {
              type: "number",
              description: "Max results to return (default 10, max 20)",
            },
          },
        },
      },
    ],
  },
];

type GeminiContent = { role: string; parts: Array<Record<string, unknown>> };

function normalizeGeminiContents(contents: GeminiContent[]): GeminiContent[] {
  return contents
    .map((entry) => {
      const parts = (entry.parts ?? []).filter((part) => {
        if (!part || typeof part !== "object") return false;
        if (typeof part.text === "string") return part.text.trim().length > 0;
        if (part.functionCall) return true;
        if (part.functionResponse) return true;
        return false;
      });
      return { role: entry.role, parts };
    })
    .filter((entry) => entry.parts.length > 0);
}

async function callGemini(
  apiKey: string,
  endpoint: string,
  systemPrompt: string,
  contents: GeminiContent[],
  toolConfig?: { function_calling_config: { mode: string; allowed_function_names?: string[] } },
) {
  const normalized = normalizeGeminiContents(contents);
  if (normalized.length === 0) {
    throw new Error("Gemini request has no valid content parts");
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      tools: TOOLS,
      tool_config: toolConfig ?? { function_calling_config: { mode: "AUTO" } },
      contents: normalized,
      generation_config: { temperature: 0.6, max_output_tokens: 4096 },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) return new Response("Unauthorized", { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const apiKey = process.env.VERTEX_AI_API_KEY;
  const project = process.env.GCP_PROJECT_ID;
  const region = process.env.GCP_REGION ?? "us-central1";

  if (!apiKey || !project) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const autoStart = body.autoStart === true;
  const fetchRecommendations = body.mode === "recommendations";
  const incomingMessages: Array<{ role: "user" | "assistant"; content: string }> =
    body.messages ?? [];

  if (!autoStart && !fetchRecommendations && !incomingMessages.length) {
    return new Response("Bad request", { status: 400 });
  }

  const systemPrompt = await buildCollegeListSystemPrompt(user.id, supabase);
  const endpoint = getGeminiEndpoint(project, region);

  const { data: profileRow } = await supabase
    .from("counselly_profiles")
    .select(
      "intended_major, financial_aid_importance, target_countries, college_type_preference, india_track, grade, board, college_list_context",
    )
    .eq("id", user.id)
    .maybeSingle();

  const listContext = parseCollegeListContext(profileRow?.college_list_context);
  let liveContext: CollegeListContext = { ...listContext };
  const profileForDiscovery: ProfileForDiscovery = {
    intended_major: profileRow?.intended_major,
    financial_aid_importance: profileRow?.financial_aid_importance,
    target_countries: profileRow?.target_countries,
    college_type_preference: profileRow?.college_type_preference,
    india_track: profileRow?.india_track,
    grade: profileRow?.grade,
    board: profileRow?.board,
  };
  const targetCountries = resolveTargetCountries(profileForDiscovery, listContext);

  // effectiveTargetCountries = target countries that actually have colleges in the DB.
  // Derived from the recommendation pool so unsupported countries (Ireland, New Zealand, etc.)
  // are silently dropped before validation and country clamping.
  let effectiveTargetCountries = targetCountries;
  let targetCountriesLabel =
    targetCountries.length > 0 ? targetCountries.join(", ") : "USA, UK, Canada, Germany, Singapore";

  let recommendationPoolPrompt = "";
  if (fetchRecommendations) {
    const studyField =
      listContext.study_field?.trim() ||
      profileRow?.intended_major?.trim() ||
      undefined;
    const pool = await fetchRecommendationPool({
      countries: targetCountries,
      programs: programsFromStudyField(studyField),
    });
    recommendationPoolPrompt = formatRecommendationPoolForPrompt(pool);

    // Use only countries the pool actually found colleges for
    const coveredCountries = Object.keys(pool.byCountry);
    if (coveredCountries.length > 0) {
      effectiveTargetCountries = coveredCountries;
      targetCountriesLabel = coveredCountries.join(", ");
    }
  }

  const { readable: stream, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const push = async (event: SSEEvent) => {
    try {
      await writer.write(encodeEvent(event));
    } catch {
      /* closed */
    }
  };
  const close = async () => {
    try {
      await push({ type: "done" });
      await writer.close();
    } catch {
      /* closed */
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents: GeminiContent[] = incomingMessages
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  if (autoStart && contents.length === 0) {
    contents.push({
      role: "user",
      parts: [
        {
          text: `${AUTO_START_TOKEN} The student just opened the College List page for the first time. Reply with ONLY a brief 1–2 sentence welcome referencing their profile. Then you MUST call ask_clarifying_question in the same response — do not ask anything in plain text.`,
        },
      ],
    });
  } else if (fetchRecommendations) {
    const poolBlock = recommendationPoolPrompt
      ? `\n\n${recommendationPoolPrompt}`
      : "";
    contents.push({
      role: "user",
      parts: [
        {
          text: `[FETCH_RECOMMENDATIONS] Discovery is complete. Build recommendations from counselly_colleges (search_college_database + shortlist below). You may also web_search for scholarship deadlines or recent news if useful — but all college stats in suggest_colleges must come from counselly_colleges.${poolBlock}\n\nThen call suggest_colleges with **10–14 colleges** from the shortlist: 1–2 per target country (${targetCountriesLabel}), reach/target mix, and **2–3 safety** only. Include 2–3 sentences of intro text. No welcome. No ask_clarifying_question.`,
        },
      ],
    });
  } else if (contents.length > 0) {
    contents.push({
      role: "user",
      parts: [
        {
          text: "[CONTINUE_SESSION] The student answered your last question. Do NOT greet or welcome again. Call ask_clarifying_question for the next missing topic OR suggest_colleges if ready. No intro text.",
        },
      ],
    });
  }

  (async () => {
    try {
      const MAX_ROUNDS = fetchRecommendations ? 14 : 10;
      let rounds = 0;
      let questionEmitted = false;
      let recommendationsEmitted = false;
      let textEmittedThisTurn = false;
      let searchCounter = 0;

      while (rounds < MAX_ROUNDS) {
        rounds++;
        textEmittedThisTurn = false;

        const geminiRes = await callGemini(apiKey, endpoint, systemPrompt, contents);
        const candidate = geminiRes?.candidates?.[0];

        if (!candidate) {
          await push({
            type: "text",
            delta: "Sorry, I couldn't generate a response. Please try again.",
          });
          break;
        }

        const parts = candidate?.content?.parts ?? [];

        let hasToolCall = false;
        const textParts: string[] = [];
        const functionCalls: Array<{
          name: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: Record<string, any>;
        }> = [];

        for (const part of parts) {
          if (part.text) textParts.push(part.text);
          else if (part.functionCall) {
            hasToolCall = true;
            functionCalls.push({
              name: part.functionCall.name,
              args: part.functionCall.args ?? {},
            });
          }
        }

        if (textParts.length > 0) {
          // In recommendations mode, skip streaming AI text when there are also
          // tool calls — prevents the same intro text repeating on every retry round.
          // The suggest_colleges handler adds a clean hardcoded intro when ready.
          if (!fetchRecommendations || !hasToolCall) {
            textEmittedThisTurn = true;
            const fullText = textParts.join("");
            const words = fullText.split(/(\s+)/);
            for (const word of words) {
              if (word) await push({ type: "text", delta: word });
            }
          }
        }

        const modelParts = candidate.content?.parts ?? parts;
        if (modelParts.length > 0) {
          contents.push({ role: "model", parts: modelParts });
        } else if (hasToolCall) {
          await push({
            type: "text",
            delta: "Sorry, I couldn't generate a response. Please try again.",
          });
          break;
        }

        if (!hasToolCall) {
          break;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const functionResponses: any[] = [];
        let shouldStop = false;

        for (const fc of functionCalls) {
          const { name, args } = fc;
          let result = "";

          if (name === "web_search") {
            const query = args.query as string;
            const num = Math.min((args.num_results as number) ?? 5, 8);
            const searchId = `web-${++searchCounter}`;
            await push({ type: "search_start", id: searchId, source: "web", query });
            const results = await webSearch(query, num);
            await push({
              type: "search",
              id: searchId,
              source: "web",
              query,
              total: results.length,
              results: results.map((r) => ({
                title: r.title,
                url: r.url,
                snippet: r.snippet,
              })),
            });
            result =
              results.length > 0
                ? formatSearchResults(results)
                : "No search results. Proceed with general knowledge but note uncertainty.";

          } else if (name === "ask_clarifying_question") {
            questionEmitted = true;
            await push({
              type: "question",
              question: args.question as string,
              options: args.options as string[],
              allowMultiple: args.allow_multiple === true,
            });
            result = "Question presented to student.";
            functionResponses.push({ functionResponse: { name, response: { result } } });
            contents.push({ role: "user", parts: functionResponses });
            shouldStop = true;
            break;

          } else if (name === "save_list_preferences") {
            await push({ type: "status", icon: "edit", text: "Saving your preferences…" });
            const { data: profileRow } = await supabase
              .from("counselly_profiles")
              .select("college_list_context")
              .eq("id", user.id)
              .maybeSingle();

            const existing = parseCollegeListContext(profileRow?.college_list_context);

            const updates: Partial<CollegeListContext> = { last_updated: new Date().toISOString() };
            if (args.budget_constraint !== undefined) updates.budget_constraint = args.budget_constraint;
            if (args.scholarship_need !== undefined) updates.scholarship_need = args.scholarship_need;
            if (args.annual_budget_inr !== undefined) updates.annual_budget_inr = args.annual_budget_inr;
            if (args.annual_budget_usd !== undefined) updates.annual_budget_inr = args.annual_budget_usd;
            if (args.campus_size !== undefined) updates.campus_size = args.campus_size;
            if (args.campus_setting !== undefined) updates.campus_setting = args.campus_setting;
            if (args.colleges_in_mind !== undefined) updates.colleges_in_mind = args.colleges_in_mind;
            if (args.study_field !== undefined) updates.study_field = args.study_field;
            if (args.study_field_decided !== undefined) updates.study_field_decided = args.study_field_decided;
            if (args.priorities !== undefined) updates.priorities = args.priorities;
            if (args.location_preferences !== undefined) updates.location_preferences = args.location_preferences;
            if (args.notes !== undefined) updates.notes = args.notes;

            const merged = { ...existing, ...updates };
            liveContext = merged;
            const { error } = await supabase
              .from("counselly_profiles")
              .update({ college_list_context: merged })
              .eq("id", user.id);

            if (error) {
              result = `Error: ${error.message}`;
              await push({ type: "action", text: "Failed to save preferences", success: false });
            } else {
              result = "Preferences saved.";
            }

          } else if (name === "update_discovery_stage") {
            const stage = args.stage as string;
            await push({ type: "stage", stage });

            const { data: profileRow } = await supabase
              .from("counselly_profiles")
              .select("college_list_context")
              .eq("id", user.id)
              .maybeSingle();

            const existing = parseCollegeListContext(profileRow?.college_list_context);
            const merged: CollegeListContext = {
              ...existing,
              discovery_stage: stage as CollegeListContext["discovery_stage"],
              discovery_completed: stage === "complete",
              last_updated: new Date().toISOString(),
            };

            await supabase
              .from("counselly_profiles")
              .update({ college_list_context: merged })
              .eq("id", user.id);

            result = `Stage updated to ${stage}.`;

          } else if (name === "suggest_colleges") {
            const colleges = (args.colleges ?? []) as CollegeRecommendation[];
            if (colleges.length === 0) {
              result = "No colleges provided — return 10–14 schools from counselly_colleges via suggest_colleges.";
            } else {
              const { enriched, missing } = await enrichRecommendationsFromDb(colleges);
              const isLateRound = rounds >= MAX_ROUNDS - 2;
              const hasEnoughEnriched = enriched.length >= 7;

              // In recommendations mode, prefer effective target-country colleges; filter out strays
              const targetOnly =
                fetchRecommendations && effectiveTargetCountries.length > 0
                  ? enriched.filter((c) =>
                      effectiveTargetCountries.some((tc) => countriesMatch(tc, c.country)),
                    )
                  : enriched;
              // Use target-filtered list if it has enough colleges, else fall back to all enriched
              const toShow = targetOnly.length >= 5 ? targetOnly : enriched;

              if (missing.length > 0 && !isLateRound && !hasEnoughEnriched) {
                result = `These colleges are NOT in counselly_colleges — replace with exact names from search_college_database or the shortlist: ${missing.join(", ")}. Then resubmit the full 10–14 list.`;
              } else if (toShow.length === 0) {
                result = "None of the suggested colleges were found in counselly_colleges. Use exact names from search_college_database or the provided shortlist.";
              } else if (fetchRecommendations) {
                const validation = validateRecommendationBatch(toShow, effectiveTargetCountries);
                if (!validation.valid && !isLateRound) {
                  result = validation.feedback;
                } else {
                  if (!textEmittedThisTurn) {
                    await push({
                      type: "text",
                      delta:
                        "Based on your profile and verified Counselly data, here are colleges I'd recommend — grouped by fit across your target countries:\n\n",
                    });
                  }
                  await push({ type: "recommendations", colleges: toShow });
                  await push({ type: "stage", stage: "recommendations" });
                  recommendationsEmitted = true;
                  result = `Presented ${toShow.length} college recommendations from counselly_colleges.`;
                }
              } else {
                if (!textEmittedThisTurn) {
                  await push({
                    type: "text",
                    delta:
                      "Based on verified Counselly data, here are colleges I'd recommend:\n\n",
                  });
                }
                await push({ type: "recommendations", colleges: enriched });
                await push({ type: "stage", stage: "recommendations" });
                recommendationsEmitted = true;
                result = `Presented ${enriched.length} college recommendations from counselly_colleges.`;
              }
            }

          } else if (name === "search_college_database") {
            const queryLabel =
              (args.name_query as string) ||
              [
                (args.countries as string[])?.join(", "),
                (args.programs as string[])?.join(", "),
              ]
                .filter(Boolean)
                .join(" · ") ||
              "Counselly college database";
            const searchId = `db-${++searchCounter}`;
            await push({
              type: "search_start",
              id: searchId,
              source: "database",
              query: queryLabel,
            });
            try {
              const requestedCountries = args.countries as string[] | undefined;
              let effectiveCountries: string[] | undefined;
              if (fetchRecommendations && effectiveTargetCountries.length > 0) {
                // Recommendations mode: clamp to DB-verified target countries only
                if (requestedCountries?.length) {
                  const filtered = requestedCountries.filter((c) =>
                    effectiveTargetCountries.some((tc) => countriesMatch(tc, c)),
                  );
                  effectiveCountries = filtered.length > 0 ? filtered : effectiveTargetCountries;
                } else {
                  effectiveCountries = args.name_query ? undefined : effectiveTargetCountries;
                }
              } else {
                // Regular mode: auto-inject target countries when none specified and no name query
                effectiveCountries = requestedCountries?.length
                  ? requestedCountries
                  : !args.name_query && effectiveTargetCountries.length > 0
                    ? effectiveTargetCountries
                    : requestedCountries;
              }
              const colleges = await searchCollegesForAI({
                name_query: args.name_query as string | undefined,
                countries: effectiveCountries,
                programs: args.programs as string[] | undefined,
                tags: args.tags as string[] | undefined,
                max_acceptance_rate: args.max_acceptance_rate as number | undefined,
                min_acceptance_rate: args.min_acceptance_rate as number | undefined,
                intl_financial_aid: args.intl_financial_aid as boolean | undefined,
                limit: args.limit as number | undefined,
              });
              await push({
                type: "search",
                id: searchId,
                source: "database",
                query: queryLabel,
                total: colleges.length,
                results: colleges.slice(0, 8).map((c) => ({
                  title: c.name,
                  url: c.website_url ?? "",
                  snippet: `${c.country ?? ""}${c.acceptance_rate != null ? ` · ${c.acceptance_rate}% accept` : ""}${c.qs_rank != null ? ` · QS ${c.qs_rank}` : ""}`.trim(),
                })),
              });
              result =
                colleges.length > 0
                  ? JSON.stringify(colleges, null, 2)
                  : "No colleges found in counselly_colleges matching those criteria. Try broadening the search.";
            } catch (e) {
              await push({
                type: "search",
                id: searchId,
                source: "database",
                query: queryLabel,
                total: 0,
                results: [],
              });
              result = `Database search failed: ${e instanceof Error ? e.message : "unknown error"}`;
            }

          } else if (name === "add_college") {
            await push({
              type: "status",
              icon: "edit",
              text: `Adding ${args.college_name}…`,
            });
            const { count } = await supabase
              .from("counselly_college_list")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id);

            const { error } = await supabase.from("counselly_college_list").insert({
              user_id: user.id,
              college_name: args.college_name,
              country: args.country,
              tier: args.tier,
              program: args.program ?? null,
              status: "researching",
              sort_order: count ?? 0,
            });

            if (error) {
              result = `Error: ${error.message}`;
              await push({
                type: "action",
                text: `Failed to add ${args.college_name}`,
                success: false,
              });
            } else {
              result = `Added ${args.college_name}.`;
              await push({
                type: "action",
                text: `Added ${args.college_name} to your list`,
                success: true,
              });
            }
          }

          if (!shouldStop) {
            functionResponses.push({ functionResponse: { name, response: { result } } });
          }
        }

        if (shouldStop) {
          await close();
          return;
        }

        if (functionResponses.length > 0) {
          contents.push({ role: "user", parts: functionResponses });
        } else {
          break;
        }
      }

      if (fetchRecommendations && !recommendationsEmitted) {
        const poolBlock = recommendationPoolPrompt
          ? `\n\n${recommendationPoolPrompt}`
          : "";
        const forceContents: GeminiContent[] = [
          {
            role: "user",
            parts: [
              {
                text: `[FORCE_RECOMMENDATIONS] You MUST call suggest_colleges now. Pick 10–14 colleges ONLY from the shortlist below. Use exact DB names. Restrict to target countries (${targetCountriesLabel}) only. Reach/target mix, 2–3 safety.${poolBlock}`,
              },
            ],
          },
        ];

        // Force the model to call suggest_colleges — no plain-text fallback allowed
        const geminiRes = await callGemini(
          apiKey,
          endpoint,
          systemPrompt,
          forceContents,
          { function_calling_config: { mode: "ANY", allowed_function_names: ["suggest_colleges"] } },
        );
        const candidate = geminiRes?.candidates?.[0];
        if (candidate) {
          const parts = candidate?.content?.parts ?? [];
          const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
          for (const part of parts) {
            if (part.functionCall) {
              functionCalls.push({ name: part.functionCall.name, args: part.functionCall.args ?? {} });
            }
          }

          for (const fc of functionCalls) {
            if (fc.name !== "suggest_colleges") continue;
            const colleges = ((fc.args.colleges as CollegeRecommendation[]) ?? []).filter(Boolean);
            if (colleges.length === 0) continue;
            const { enriched } = await enrichRecommendationsFromDb(colleges);
            if (enriched.length === 0) continue;
            // Filter to DB-verified target countries; if not enough, fall back to all enriched
            const filtered =
              effectiveTargetCountries.length > 0
                ? enriched.filter((c) => effectiveTargetCountries.some((tc) => countriesMatch(tc, c.country)))
                : enriched;
            const toShow = filtered.length >= 4 ? filtered : enriched;
            await push({
              type: "text",
              delta: "Based on verified Counselly data, here are colleges I'd recommend:\n\n",
            });
            await push({ type: "recommendations", colleges: toShow });
            await push({ type: "stage", stage: "recommendations" });
            recommendationsEmitted = true;
            break;
          }
        }

        if (!recommendationsEmitted) {
          await push({
            type: "text",
            delta:
              "I wasn't able to generate your college list right now. Tap the input below and type anything — I'll try again immediately.",
          });
        }
      }

      if (!questionEmitted && !liveContext.discovery_completed && !fetchRecommendations) {
        const fallback = getNextDiscoveryQuestion(
          profileForDiscovery,
          liveContext,
          listContext.messages,
        );
        if (fallback) {
          await push({
            type: "question",
            question: fallback.question,
            options: fallback.options,
            allowMultiple: fallback.allowMultiple,
          });
          await push({ type: "stage", stage: "preferences" });
        }
      }

      await close();
    } catch (err) {
      try {
        await push({
          type: "text",
          delta: "\n\nSomething went wrong. Please try again.",
        });
        await close();
      } catch {
        /* closed */
      }
      console.error("[counselly/college-list]", err);
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
