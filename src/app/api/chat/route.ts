import { createClient } from "@/lib/supabase/server";
import { webSearch, formatSearchResults } from "@/lib/search";
import { searchCollegesForAI } from "@/lib/colleges-db";

// ── Gemini config ─────────────────────────────────────────────────────────────

const MODEL = "gemini-2.5-flash";

function getGeminiEndpoint(project: string, region: string) {
  return (
    `https://${region}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${region}/publishers/google/models/${MODEL}:generateContent`
  );
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

type SSEEvent =
  | { type: "status"; icon: string; text: string }
  | { type: "search_start"; id: string; source: "web" | "database"; query: string }
  | {
      type: "search";
      id: string;
      source: "web" | "database";
      query: string;
      total: number;
      results: Array<{ title: string; url: string; snippet?: string }>;
    }
  | { type: "text"; delta: string }
  | { type: "action"; text: string; success: boolean }
  | { type: "question"; questions: Array<{ question: string; options: string[] }> }
  | { type: "done" };

const sseEncoder = new TextEncoder();

function encodeEvent(event: SSEEvent): Uint8Array {
  return sseEncoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

// ── Profile / system prompt ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildSystemPrompt(userId: string, supabase: any): Promise<string> {
  const [profileRes, testRes, actRes, honorRes, essayRes, collegeRes] =
    await Promise.all([
      supabase
        .from("counselly_profiles")
        .select(
          "full_name, grade, board, target_countries, intended_major, india_track, academic_score, score_type, application_cycle, financial_aid_importance, college_type_preference, help_needed, personal_details, subject_scores, predicted_grades, language_proficiency, language_test_taken, language_test_score"
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("counselly_test_scores")
        .select("id, test_name, status, total_score, section_scores, test_date, attempt_number")
        .eq("user_id", userId),
      supabase
        .from("counselly_activities")
        .select("id, activity_type, name, organization, position, description, is_leadership, hours_per_week, weeks_per_year, sort_order")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("counselly_honors")
        .select("id, title, field, issuing_org, level, year, status, award, description")
        .eq("user_id", userId),
      supabase
        .from("counselly_essays")
        .select("id, essay_type, college_name, prompt, status, word_count, word_limit")
        .eq("user_id", userId),
      supabase
        .from("counselly_college_list")
        .select("id, college_name, country, program, tier, status, application_deadline")
        .eq("user_id", userId),
    ]);

  const profile = profileRes.data;
  const tests = testRes.data ?? [];
  const activities = actRes.data ?? [];
  const honors = honorRes.data ?? [];
  const essays = essayRes.data ?? [];
  const colleges = collegeRes.data ?? [];

  const firstName = profile?.full_name?.split(" ")[0] ?? "the student";

  const lines: string[] = [
    `You are Counselly, an expert AI college counsellor for ${firstName}, an Indian student applying to universities.`,
    "",
    "## Your Role & Capabilities",
    "You have the same knowledge and capabilities as a top-tier college counsellor. You:",
    "- Give personalised, strategic advice based on the student's complete profile",
    "- Search the web for the latest college statistics, deadlines, scholarships, and program details",
    "- Can update the student's profile directly (add activities, honors, colleges, etc.)",
    "- Ask targeted follow-up questions (as multiple-choice options) to gather information",
    "- Know the Indian context: CBSE, ISC, IB, JEE, NEET, UCAS, Common App",
    "",
    "## Communication Style",
    "- Be warm, direct, and specific — never generic",
    "- Use bullet points for factual lists and advice; use bold for key terms",
    "- Give actionable next steps, not vague encouragement",
    "- When asked about specific colleges, programs, stats, or rankings, prefer calling search_college_database first. Use web_search for very recent details, scholarship deadlines, or when the database has no match.",
    "",
    "## ⚠️ ABSOLUTE RULE — Never Write Options as Text",
    "If you need more information and want to present the student with choices, you MUST call the `ask_clarifying_question` tool. This is not optional.",
    "",
    "FORBIDDEN — you will NEVER do this:",
    "  Writing 'Are you thinking about: • College list? • Deadlines? • Profile?' in your text response.",
    "  Writing any kind of numbered or bulleted list for the student to choose from.",
    "  Ending your response with multiple options for the user to pick between in plain text.",
    "",
    "REQUIRED — you WILL always do this instead:",
    "  1. Write a single short sentence like 'To help you best, I need one quick piece of info.'",
    "  2. Call ask_clarifying_question with { questions: [{ question: '...', options: ['...', '...'] }] }",
    "  3. Stop — the UI renders the options as tap buttons; do not describe them in text.",
    "",
    "Self-check before every response: Am I about to list options for the student to choose from? If YES → stop, delete those options, call the tool instead.",
    "",
    "Example — student says 'hi' or 'what should I do?':",
    "  CORRECT: Write 'Hi! Quick question to point you in the right direction.' → call ask_clarifying_question({questions:[{question:'What would you like help with today?',options:['Review my college list','Upcoming deadlines','Essay help','Strengthen my profile','Something else']}]})",
    "  WRONG: Write 'Hi! Are you thinking about: • College list? • Deadlines? • Essays?'",
    "",
    "## Tool Use Guidelines",
    "- Call search_college_database or web_search whenever the student asks about specific colleges, programs, stats, deadlines, or scholarships. Always prefer search_college_database for verified institutional facts.",
    "- Call get_full_profile if you need more detail than what is in this system prompt",
    "- Call ask_clarifying_question whenever you would present options — 1 to 3 questions at once; DO NOT write the options in text",
    "- Call add_activity, add_honor, or add_college when the student mentions something new",
    "",
    "## Student Profile",
  ];

  if (profile) {
    if (profile.full_name) lines.push(`- **Name:** ${profile.full_name}`);
    if (profile.grade) lines.push(`- **Grade:** ${profile.grade}`);
    if (profile.board) lines.push(`- **Board:** ${profile.board}`);
    if (profile.application_cycle) lines.push(`- **Application Cycle:** ${profile.application_cycle}`);
    if (profile.target_countries?.length) lines.push(`- **Target Countries:** ${profile.target_countries.join(", ")}`);
    if (profile.intended_major) lines.push(`- **Intended Major:** ${profile.intended_major}`);
    if (profile.india_track) lines.push(`- **India Track:** ${profile.india_track}`);
    if (profile.academic_score) {
      const scoreLabel = profile.score_type === "percentage"
        ? `${profile.academic_score}%`
        : `${profile.academic_score} (${profile.score_type})`;
      lines.push(`- **Academic Score:** ${scoreLabel}`);
    }
    if (profile.subject_scores && Object.keys(profile.subject_scores).length > 0) {
      lines.push(`- **Subject Scores:** ${Object.entries(profile.subject_scores).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
    }
    if (profile.financial_aid_importance) lines.push(`- **Financial Aid:** ${profile.financial_aid_importance}`);
    if (profile.help_needed?.length) lines.push(`- **Needs Help With:** ${profile.help_needed.join(", ")}`);
    const pd = profile.personal_details;
    if (pd?.bio) lines.push(`- **Bio:** ${pd.bio}`);
    if (pd?.location) lines.push(`- **Location:** ${pd.location}`);
  }

  if (tests.length > 0) {
    lines.push("", "## Test Scores");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bestByTest = new Map<string, any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const t of tests as any[]) {
      const existing = bestByTest.get(t.test_name);
      if (!existing || (t.total_score ?? 0) > (existing.total_score ?? 0)) bestByTest.set(t.test_name, t);
    }
    for (const [, t] of bestByTest) {
      const sections = t.section_scores
        ? Object.entries(t.section_scores as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(", ")
        : null;
      lines.push(`- **${t.test_name}:** ${t.total_score ?? "planned"}${sections ? ` (${sections})` : ""} — ${t.status}`);
    }
  }

  if (activities.length > 0) {
    lines.push("", "## Activities");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of activities as any[]) {
      const parts = [a.name ?? a.activity_type ?? "Activity", a.organization ? `at ${a.organization}` : null, a.position ? `— ${a.position}` : null, a.hours_per_week ? `${a.hours_per_week} hrs/wk` : null, a.is_leadership ? "(Leadership)" : null].filter(Boolean);
      lines.push(`- [ID:${a.id}] ${parts.join(" ")}${a.description ? `: ${a.description}` : ""}`);
    }
  }

  if (honors.length > 0) {
    lines.push("", "## Honors & Awards");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const h of honors as any[]) {
      lines.push(`- [ID:${h.id}] **${h.title}** — ${h.level ?? ""}${h.year ? ` (${h.year})` : ""}${h.issuing_org ? ` | ${h.issuing_org}` : ""}`);
    }
  }

  if (colleges.length > 0) {
    lines.push("", "## College List");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byTier: Record<string, any[]> = { reach: [], target: [], safety: [], "exam-cutoff": [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of colleges as any[]) byTier[c.tier ?? "target"]?.push(c);
    for (const [tier, list] of Object.entries(byTier)) {
      if (list.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lines.push(`- **${tier.charAt(0).toUpperCase() + tier.slice(1)}:** ${list.map((c: any) => `${c.college_name} (${c.country})`).join(", ")}`);
      }
    }
  } else {
    lines.push("", "## College List", "- No colleges added yet.");
  }

  if (essays.length > 0) {
    lines.push("", "## Essays");
    const statusCounts: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const e of essays as any[]) statusCounts[e.status ?? "unknown"] = (statusCounts[e.status ?? "unknown"] ?? 0) + 1;
    for (const [status, count] of Object.entries(statusCounts)) {
      lines.push(`- ${count} essay(s) ${status.replace(/_/g, " ")}`);
    }
  }

  return lines.join("\n");
}

// ── Gemini tool declarations ──────────────────────────────────────────────────

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "web_search",
        description: "Search the web for up-to-date information about colleges, admissions stats, scholarships, deadlines, and programs. Call this whenever the student asks about specific institutions or time-sensitive data.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query" },
            num_results: { type: "number", description: "Number of results (default 5, max 8)" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_full_profile",
        description: "Retrieve the student's complete and up-to-date profile. Call this when you need fresh data not covered in the system prompt.",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "add_activity",
        description: "Add a new extracurricular activity to the student's profile when they tell you about one.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Activity name" },
            activity_type: { type: "string", description: "Type: Academic, Arts, Athletics, Career, Community Service, Cultural, Research, Science/Math, Sports, Technology, Work, Other" },
            position: { type: "string", description: "Role or position (e.g. President, Member)" },
            organization: { type: "string", description: "Organization or school name" },
            description: { type: "string", description: "What you do — max 150 characters" },
            hours_per_week: { type: "number", description: "Hours per week" },
            weeks_per_year: { type: "number", description: "Weeks per year" },
            is_leadership: { type: "boolean", description: "Whether this is a leadership role" },
          },
          required: ["name"],
        },
      },
      {
        name: "update_activity",
        description: "Update an existing activity using its ID from the profile.",
        parameters: {
          type: "object",
          properties: {
            id: { type: "string", description: "Activity ID" },
            name: { type: "string" },
            activity_type: { type: "string" },
            position: { type: "string" },
            organization: { type: "string" },
            description: { type: "string" },
            hours_per_week: { type: "number" },
            weeks_per_year: { type: "number" },
            is_leadership: { type: "boolean" },
          },
          required: ["id"],
        },
      },
      {
        name: "add_honor",
        description: "Add a new honor, award, or competition result to the student's profile.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Title of the honor or award" },
            field: { type: "string", description: "Subject area (e.g. Science, Math, Writing)" },
            issuing_org: { type: "string", description: "Organization that issued the award" },
            level: { type: "string", description: "Level: School, District/City, State/Regional, National, International" },
            year: { type: "number", description: "Year of the award" },
            status: { type: "string", description: "participated, placed, or won" },
            award: { type: "string", description: "Specific award or rank" },
            description: { type: "string", description: "Brief description" },
          },
          required: ["title"],
        },
      },
      {
        name: "update_honor",
        description: "Update an existing honor using its ID from the profile.",
        parameters: {
          type: "object",
          properties: {
            id: { type: "string", description: "Honor ID" },
            title: { type: "string" },
            field: { type: "string" },
            issuing_org: { type: "string" },
            level: { type: "string" },
            year: { type: "number" },
            status: { type: "string" },
            award: { type: "string" },
          },
          required: ["id"],
        },
      },
      {
        name: "update_profile",
        description: "Update specific fields on the student's core profile.",
        parameters: {
          type: "object",
          properties: {
            academic_score: { type: "string" },
            score_type: { type: "string", description: "percentage | cgpa_10 | cgpa_4 | ib" },
            intended_major: { type: "string" },
            financial_aid_importance: { type: "string", description: "critical | helpful | not_needed" },
            language_proficiency: { type: "string" },
            language_test_taken: { type: "string" },
            language_test_score: { type: "string" },
          },
        },
      },
      {
        name: "add_college",
        description: "Add a college to the student's list.",
        parameters: {
          type: "object",
          properties: {
            college_name: { type: "string" },
            country: { type: "string" },
            tier: { type: "string", description: "reach | target | safety | exam-cutoff" },
            program: { type: "string", description: "Specific program or major" },
            application_deadline: { type: "string", description: "YYYY-MM-DD format" },
          },
          required: ["college_name", "country", "tier"],
        },
      },
      {
        name: "search_college_database",
        description:
          "Query the Counselly college database for structured, factual data about colleges — acceptance rates, costs, SAT/ACT score ranges, QS rankings, strong programs, and financial aid availability. " +
          "Always prefer this over web_search for institutional facts. Use web_search only for very recent events, current-cycle stats not in the database, or specific scholarship deadlines.",
        parameters: {
          type: "object",
          properties: {
            name_query: {
              type: "string",
              description: "Partial college name to search for (e.g. 'MIT', 'Toronto', 'Imperial')",
            },
            countries: {
              type: "array",
              items: { type: "string" },
              description: "Filter by countries: 'USA', 'UK', 'Canada', 'Australia', 'Singapore', 'Germany', 'Netherlands', 'Hong Kong', etc.",
            },
            programs: {
              type: "array",
              items: { type: "string" },
              description: "Filter by strong programs, e.g. ['Computer Science', 'Engineering', 'Economics']",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Filter by tags: 'ivy-league', 'need-blind-intl', 'stem-heavy', 'liberal-arts', 'test-optional', 'public-university', etc.",
            },
            max_acceptance_rate: {
              type: "number",
              description: "Maximum acceptance rate in percent (e.g. 15 means ≤ 15%)",
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
      {
        name: "ask_clarifying_question",
        description: "ALWAYS use this tool when you want to present choices to the student. Never write options as bullet points in text — use this tool instead. It renders interactive tap buttons in the chat UI. Ask 1–3 multiple-choice questions to gather the information you need. The student taps a button to answer; you then receive their answer and continue.",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              description: "1–3 questions to ask. Each has a question string and 2–6 option strings.",
              items: {
                type: "object",
                properties: {
                  question: { type: "string", description: "The question to ask" },
                  options: {
                    type: "array",
                    items: { type: "string" },
                    description: "2–6 answer options",
                  },
                },
              },
            },
          },
          required: ["questions"],
        },
      },
    ],
  },
];

// ── Gemini API call (non-streaming for agentic loop) ──────────────────────────

async function callGemini(
  apiKey: string,
  endpoint: string,
  systemPrompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contents: any[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      tools: TOOLS,
      tool_config: { function_calling_config: { mode: "AUTO" } },
      contents,
      generation_config: {
        temperature: 0.7,
        max_output_tokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) return new Response("Unauthorized", { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
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
  const incomingMessages: Array<{ role: "user" | "assistant"; content: string }> = body.messages ?? [];
  if (!incomingMessages.length) return new Response("Bad request", { status: 400 });

  const [systemPrompt, profileRes] = await Promise.all([
    buildSystemPrompt(user.id, supabase),
    supabase.from("counselly_profiles").select("target_countries").eq("id", user.id).maybeSingle(),
  ]);
  const chatTargetCountries: string[] = profileRes.data?.target_countries ?? [];
  const endpoint = getGeminiEndpoint(project, region);

  const { readable: stream, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let searchCounter = 0;

  const push = async (event: SSEEvent) => {
    try { await writer.write(encodeEvent(event)); } catch { /* closed */ }
  };
  const close = async () => {
    try { await push({ type: "done" }); await writer.close(); } catch { /* closed */ }
  };

  // Build initial Gemini contents from incoming messages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents: any[] = incomingMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Agentic loop in background
  (async () => {
    try {
      const MAX_ROUNDS = 8;
      let rounds = 0;

      while (rounds < MAX_ROUNDS) {
        rounds++;

        const geminiRes = await callGemini(apiKey, endpoint, systemPrompt, contents);

        const candidate = geminiRes?.candidates?.[0];
        if (!candidate) {
          await push({ type: "text", delta: "Sorry, I couldn't generate a response. Please try again." });
          break;
        }

        const parts = candidate?.content?.parts ?? [];
        const finishReason = candidate?.finishReason;

        // Collect text and function calls from this response
        let hasToolCall = false;
        const textParts: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const functionCalls: Array<{ name: string; args: Record<string, any>; callIndex: number }> = [];

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (part.text) {
            textParts.push(part.text);
          } else if (part.functionCall) {
            hasToolCall = true;
            functionCalls.push({ name: part.functionCall.name, args: part.functionCall.args ?? {}, callIndex: i });
          }
        }

        // Stream any text from this round
        if (textParts.length > 0) {
          const fullText = textParts.join("");
          // Word-level streaming for smooth output
          const words = fullText.split(/(\s+)/);
          for (const word of words) {
            if (word) await push({ type: "text", delta: word });
          }
        }

        // Add model turn to conversation history
        contents.push({ role: "model", parts: candidate.content?.parts ?? parts });

        // Break only when there are no tool calls to execute.
        // Do NOT break on finishReason "STOP" here — Gemini emits STOP when it
        // decides to call a function, so we still need to execute those calls.
        if (!hasToolCall || finishReason === "MAX_TOKENS") {
          break;
        }

        // Execute all function calls and collect results
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const functionResponses: any[] = [];

        for (const fc of functionCalls) {
          const { name, args } = fc;
          let result = "";

          if (name === "web_search") {
            const query = args.query as string;
            const num = Math.min(args.num_results ?? 5, 8);
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
            result = results.length > 0
              ? formatSearchResults(results)
              : "No search results. SERPER_API_KEY may not be configured.";

          } else if (name === "get_full_profile") {
            await push({ type: "status", icon: "profile", text: "Reading your full profile…" });
            result = await buildSystemPrompt(user.id, supabase);

          } else if (name === "add_activity") {
            await push({ type: "status", icon: "edit", text: `Adding activity: ${args.name}…` });
            const { error } = await supabase.from("counselly_activities").insert({
              user_id: user.id,
              name: args.name,
              activity_type: args.activity_type ?? null,
              position: args.position ?? null,
              organization: args.organization ?? null,
              description: (args.description as string | undefined)?.slice(0, 150) ?? null,
              hours_per_week: args.hours_per_week ?? null,
              weeks_per_year: args.weeks_per_year ?? null,
              is_leadership: args.is_leadership ?? false,
            });
            if (error) {
              result = `Error: ${error.message}`;
              await push({ type: "action", text: `Failed to add activity`, success: false });
            } else {
              result = `Successfully added activity: ${args.name}`;
              await push({ type: "action", text: `Added "${args.name}" to your activities`, success: true });
            }

          } else if (name === "update_activity") {
            await push({ type: "status", icon: "edit", text: "Updating activity…" });
            const { id, ...fields } = args;
            const { error } = await supabase.from("counselly_activities").update(fields).eq("id", id).eq("user_id", user.id);
            if (error) {
              result = `Error: ${error.message}`;
              await push({ type: "action", text: "Failed to update activity", success: false });
            } else {
              result = "Activity updated.";
              await push({ type: "action", text: "Activity updated", success: true });
            }

          } else if (name === "add_honor") {
            await push({ type: "status", icon: "edit", text: `Adding honor: ${args.title}…` });
            const { error } = await supabase.from("counselly_honors").insert({
              user_id: user.id,
              title: args.title,
              field: args.field ?? null,
              issuing_org: args.issuing_org ?? null,
              level: args.level ?? null,
              year: args.year ?? null,
              status: args.status ?? null,
              award: args.award ?? null,
              description: args.description ?? null,
            });
            if (error) {
              result = `Error: ${error.message}`;
              await push({ type: "action", text: "Failed to add honor", success: false });
            } else {
              result = `Added honor: ${args.title}`;
              await push({ type: "action", text: `Added "${args.title}" to your honors`, success: true });
            }

          } else if (name === "update_honor") {
            await push({ type: "status", icon: "edit", text: "Updating honor…" });
            const { id, ...fields } = args;
            const { error } = await supabase.from("counselly_honors").update(fields).eq("id", id).eq("user_id", user.id);
            if (error) {
              result = `Error: ${error.message}`;
              await push({ type: "action", text: "Failed to update honor", success: false });
            } else {
              result = "Honor updated.";
              await push({ type: "action", text: "Honor updated", success: true });
            }

          } else if (name === "update_profile") {
            await push({ type: "status", icon: "edit", text: "Updating your profile…" });
            const ALLOWED = ["academic_score", "score_type", "intended_major", "financial_aid_importance", "language_proficiency", "language_test_taken", "language_test_score"];
            const safe = Object.fromEntries(Object.entries(args).filter(([k]) => ALLOWED.includes(k)));
            if (Object.keys(safe).length === 0) {
              result = "No valid fields to update.";
            } else {
              const { error } = await supabase.from("counselly_profiles").update(safe).eq("id", user.id);
              if (error) {
                result = `Error: ${error.message}`;
                await push({ type: "action", text: "Failed to update profile", success: false });
              } else {
                const fields = Object.keys(safe).join(", ");
                result = `Profile updated: ${fields}`;
                await push({ type: "action", text: `Profile updated (${fields})`, success: true });
              }
            }

          } else if (name === "add_college") {
            await push({ type: "status", icon: "edit", text: `Adding ${args.college_name} to your list…` });
            const { error } = await supabase.from("counselly_college_list").insert({
              user_id: user.id,
              college_name: args.college_name,
              country: args.country,
              tier: args.tier,
              program: args.program ?? null,
              application_deadline: args.application_deadline ?? null,
              status: "researching",
            });
            if (error) {
              result = `Error: ${error.message}`;
              await push({ type: "action", text: `Failed to add ${args.college_name}`, success: false });
            } else {
              result = `Added ${args.college_name} as ${args.tier}.`;
              await push({ type: "action", text: `Added ${args.college_name} as ${args.tier}`, success: true });
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
              // Auto-scope to student's target countries for general discovery (when no name or countries specified)
              const effectiveCountries = requestedCountries?.length
                ? requestedCountries
                : !args.name_query && chatTargetCountries.length > 0
                  ? chatTargetCountries
                  : requestedCountries;
              const colleges = await searchCollegesForAI({
                name_query: args.name_query as string | undefined,
                countries: effectiveCountries,
                programs: args.programs as string[] | undefined,
                tags: args.tags as string[] | undefined,
                max_acceptance_rate: args.max_acceptance_rate as number | undefined,
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
                  url: c.website_url || "",
                  snippet: [
                    c.city ? `${c.city}, ${c.country}` : c.country,
                    c.acceptance_rate ? `Acceptance: ${c.acceptance_rate}%` : null,
                    c.qs_rank ? `QS Rank: #${c.qs_rank}` : null,
                  ].filter(Boolean).join(" · "),
                })),
              });
              result = colleges.length > 0
                ? JSON.stringify(colleges, null, 2)
                : "No colleges found matching those criteria. Try broadening the search or use web_search.";
            } catch (e) {
              result = `Database search failed: ${e instanceof Error ? e.message : "unknown error"}`;
            }

          } else if (name === "ask_clarifying_question") {
            // Support both new `questions[]` format and legacy single `question`+`options`
            const qs: Array<{ question: string; options: string[] }> = Array.isArray(args.questions)
              ? args.questions
              : [{ question: args.question as string, options: args.options as string[] }];
            await push({ type: "question", questions: qs });
            result = "Questions presented to student. Waiting for their response.";
            // Add function response and stop — wait for student's answer
            functionResponses.push({ functionResponse: { name, response: { result } } });
            contents.push({ role: "user", parts: functionResponses });
            await close();
            return;
          }

          functionResponses.push({ functionResponse: { name, response: { result } } });
        }

        // Add function results and continue loop
        contents.push({ role: "user", parts: functionResponses });
      }

      await close();
    } catch (err) {
      try {
        await push({ type: "text", delta: "\n\nSomething went wrong. Please try again." });
        await close();
      } catch { /* already closed */ }
      console.error("[counselly/chat]", err);
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
