export type CollegeListDiscoveryStage =
  | "intro"
  | "preferences"
  | "recommendations"
  | "refine"
  | "complete";

export interface CollegeListMcq {
  question: string;
  options: string[];
  allowMultiple?: boolean;
  /** Set after the user submits — used to restore history without re-prompting */
  answeredWith?: string | string[];
}

export interface CollegeListContext {
  discovery_stage?: CollegeListDiscoveryStage;
  discovery_completed?: boolean;
  budget_constraint?: "strict" | "moderate" | "flexible" | "unsure";
  scholarship_need?: "essential" | "helpful" | "not_needed";
  annual_budget_inr?: string;
  /** @deprecated Use annual_budget_inr */
  annual_budget_usd?: string;
  campus_size?: "small" | "medium" | "large" | "no_preference";
  campus_setting?: "urban" | "suburban" | "rural" | "no_preference";
  colleges_in_mind?: string[];
  study_field?: string;
  study_field_decided?: boolean;
  career_goal?: string;
  placement_importance?: string;
  learning_style?: string;
  postgrad_plan?: string;
  priorities?: string[];
  location_preferences?: string[];
  notes?: string;
  last_updated?: string;
  messages?: StoredCollegeListMessage[];
}

export interface StoredCollegeListMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  question?: CollegeListMcq;
  recommendations?: CollegeRecommendation[];
  actions?: Array<{ text: string; success: boolean }>;
}

export interface CollegeRecommendation {
  college_name: string;
  country: string;
  tier: "reach" | "target" | "safety" | "exam-cutoff";
  program?: string;
  fit_summary: string;
  honest_assessment: string;
  key_facts?: string;
}

export type DiscoveryQuestion = CollegeListMcq;

export function parseCollegeListContext(raw: unknown): CollegeListContext {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as CollegeListContext;
}

export function shouldAutoStartDiscovery(
  context: CollegeListContext,
  collegeCount: number,
): boolean {
  if (context.discovery_completed) return false;
  if (context.messages && context.messages.length > 0) return false;
  if (collegeCount === 0) return true;
  return context.discovery_stage === "intro" || context.discovery_stage === "preferences";
}

export function discoveryProgress(context: CollegeListContext): {
  stage: CollegeListDiscoveryStage;
  label: string;
  step: number;
  total: number;
} {
  const stage = context.discovery_stage ?? "intro";
  const stages: CollegeListDiscoveryStage[] = [
    "intro",
    "preferences",
    "recommendations",
    "refine",
  ];
  const step = Math.max(0, stages.indexOf(stage));
  const labels: Record<CollegeListDiscoveryStage, string> = {
    intro: "Getting started",
    preferences: "Your preferences",
    recommendations: "College matches",
    refine: "Refine your list",
    complete: "List ready",
  };
  return {
    stage,
    label: labels[stage],
    step: stage === "complete" ? stages.length : step + 1,
    total: stages.length,
  };
}

export type ProfileForDiscovery = {
  intended_major?: string | null;
  financial_aid_importance?: string | null;
  target_countries?: string[] | null;
  college_type_preference?: string[] | null;
  india_track?: string | null;
  grade?: string | null;
  board?: string | null;
};

function isMajorDecided(major: string | null | undefined): boolean {
  const m = major?.trim();
  return Boolean(m && m !== "Undecided");
}

/** Major-specific follow-ups — never offer unrelated fields. */
const MAJOR_FOLLOW_UPS: Record<string, DiscoveryQuestion> = {
  "Engineering & CS": {
    question: "Within Engineering & CS, what do you want to focus on?",
    options: [
      "Computer Science",
      "Artificial Intelligence / Machine Learning",
      "Software Engineering",
      "Electrical & Computer Engineering",
      "Mechanical / Aerospace / Other engineering",
      "Still exploring within tech",
    ],
    allowMultiple: false,
  },
  "Business & Economics": {
    question: "What area of business interests you most?",
    options: [
      "Finance & Investment",
      "Consulting & Strategy",
      "Entrepreneurship / Startups",
      "Economics & Policy",
      "Marketing & Brand",
      "Still exploring business fields",
    ],
    allowMultiple: false,
  },
  Sciences: {
    question: "Which science direction fits you best?",
    options: [
      "Physics / Astronomy",
      "Chemistry / Materials",
      "Biology / Life Sciences",
      "Mathematics / Statistics",
      "Environmental Science",
      "Still exploring sciences",
    ],
    allowMultiple: false,
  },
  "Medicine & Healthcare": {
    question: "What's your healthcare career direction?",
    options: [
      "Medicine (MBBS / pre-med)",
      "Biomedical research",
      "Public health & policy",
      "Allied health (nursing, pharmacy, etc.)",
      "Still exploring healthcare paths",
    ],
    allowMultiple: false,
  },
  "Arts & Design": {
    question: "Which creative path interests you?",
    options: [
      "Visual arts & design",
      "Architecture",
      "Film / media / communication",
      "Performing arts",
      "Still exploring creative fields",
    ],
    allowMultiple: false,
  },
  "Humanities & Social Sciences": {
    question: "Which humanities area draws you most?",
    options: [
      "Psychology & cognitive science",
      "International relations & politics",
      "History & literature",
      "Sociology & anthropology",
      "Philosophy & ethics",
      "Still exploring humanities",
    ],
    allowMultiple: false,
  },
  "Law & Political Science": {
    question: "What legal or policy path are you considering?",
    options: [
      "Law (LLB / pre-law)",
      "Political science & government",
      "International law & diplomacy",
      "Human rights & social justice",
      "Still exploring",
    ],
    allowMultiple: false,
  },
};

const BROAD_MAJORS = new Set(Object.keys(MAJOR_FOLLOW_UPS));

export type ContextSummaryItem = {
  id: string;
  label: string;
  value: string;
};

/** Short label (1–2 words) for an answered MCQ in the context summary. */
export function shortenQuestionLabel(question: string): string {
  const q = question.toLowerCase();

  // Career direction — must come before "direction" check (Focus) to avoid mis-labelling
  if (q.includes("career direction") || q.includes("career goal") || q.includes("career path")) {
    return "Career";
  }

  // Placement/internship importance — before generic "career" check
  if (q.includes("placement and internship") || q.includes("career placement") || q.includes("internship access")) {
    return "Placement";
  }

  // Learning environment / style — before generic "environment" check
  if (q.includes("learning environment") || q.includes("learning style") || q.includes("teaching style")) {
    return "Learning";
  }

  // Post-grad plan
  if (q.includes("after getting your degree") || q.includes("after your degree")) {
    return "Post-grad";
  }

  if (
    q.includes("specializ") ||
    q.includes("within ") ||
    q.includes("subfield") ||
    q.includes("focus area") ||
    q.includes("direction") ||
    q.includes("area of")
  ) {
    return "Focus";
  }
  if (q.includes("budget") || q.includes("financial") || q.includes("lakh") || q.includes("₹") || q.includes("afford")) {
    return "Budget";
  }
  if (q.includes("scholarship") || q.includes("financial aid") || q.includes("need aid")) {
    return "Aid";
  }
  if (q.includes("countr") || q.includes("location") || q.includes("target") || q.includes("abroad")) {
    return "Countries";
  }
  if (
    q.includes("urban") ||
    q.includes("suburban") ||
    q.includes("rural") ||
    q.includes("city") ||
    q.includes("campus setting") ||
    q.includes("environment") ||
    q.includes("imagine") ||
    q.includes("kind of place") ||
    q.includes("where you'd")
  ) {
    return "Setting";
  }
  if (q.includes("campus size") || q.includes("student body") || q.includes("how many students")) {
    return "Size";
  }
  if (
    q.includes("learning style") ||
    q.includes("academic environment") ||
    q.includes("coursework") ||
    q.includes("curriculum") ||
    q.includes("hands-on") ||
    q.includes("theoretical") ||
    q.includes("teaching")
  ) {
    return "Style";
  }
  if (q.includes("internship") || q.includes("industry") || q.includes("career") || q.includes("placement")) {
    return "Career";
  }
  if (q.includes("priorit") || q.includes("matters most") || q.includes("important to you")) {
    return "Priorities";
  }
  if (q.includes("colleges in mind") || q.includes("dream school") || q.includes("already have")) {
    return "Ideas";
  }
  if (q.includes("ready for") || q.includes("recommendation") || q.includes("show me")) {
    return "Next";
  }
  if (
    q.includes("considering") ||
    q.includes("field of study") ||
    q.includes("want to study") ||
    q.includes("areas are you")
  ) {
    return "Field";
  }
  if (q.includes("engineering") || q.includes("major") || q.includes("focus")) {
    return "Focus";
  }
  if (q.includes("research")) return "Research";

  return "Preference";
}

export function buildContextSummaryFromMessages(
  messages: Array<{ id: string; role: string; question?: CollegeListMcq }>,
): ContextSummaryItem[] {
  const byLabel = new Map<string, ContextSummaryItem>();
  for (const m of messages) {
    if (m.role !== "assistant" || m.question?.answeredWith === undefined) continue;
    const label = shortenQuestionLabel(m.question.question);
    const answers = Array.isArray(m.question.answeredWith)
      ? m.question.answeredWith
      : [m.question.answeredWith];
    byLabel.set(label, { id: m.id, label, value: answers.join(", ") });
  }
  return Array.from(byLabel.values()).slice(-6);
}

function messagesCoverTopic(
  messages: Array<{ question?: CollegeListMcq }> | undefined,
  keywords: string[],
): boolean {
  if (!messages?.length) return false;
  for (const m of messages) {
    const q = m.question?.question?.toLowerCase() ?? "";
    if (!keywords.some((k) => q.includes(k))) continue;
    if (m.question?.answeredWith !== undefined) return true;
  }
  return false;
}

/** Pre-fill discovery context from onboarding so we skip redundant questions. */
export function mergeProfileIntoDiscoveryContext(
  context: CollegeListContext,
  profile: ProfileForDiscovery,
): CollegeListContext {
  const merged: CollegeListContext = { ...context };

  if (!merged.location_preferences?.length && profile.target_countries?.length) {
    merged.location_preferences = [...profile.target_countries];
  }

  const aid = profile.financial_aid_importance?.toLowerCase() ?? "";
  if (!merged.scholarship_need && !merged.budget_constraint && aid) {
    if (aid.includes("critical") || aid.includes("essential")) {
      merged.scholarship_need = "essential";
      merged.budget_constraint = "strict";
    } else if (aid.includes("helpful") || aid.includes("important")) {
      merged.scholarship_need = "helpful";
      merged.budget_constraint = "moderate";
    } else if (aid.includes("not")) {
      merged.scholarship_need = "not_needed";
      merged.budget_constraint = "flexible";
    }
  }

  const major = profile.intended_major?.trim();
  if (major && !merged.study_field && !BROAD_MAJORS.has(major) && major !== "Undecided") {
    merged.study_field = major;
    merged.study_field_decided = true;
  }

  return merged;
}

function needsFocusStep(
  profile: ProfileForDiscovery,
  context: CollegeListContext,
  messages?: Array<{ question?: CollegeListMcq }>,
): boolean {
  if (context.study_field_decided || context.study_field?.trim()) return false;
  if (
    messagesCoverTopic(messages, [
      "focus",
      "within",
      "specializ",
      "considering",
      "field of study",
      "areas are you",
    ])
  ) {
    return false;
  }
  if (!isMajorDecided(profile.intended_major)) return true;
  if (BROAD_MAJORS.has(profile.intended_major!.trim())) return true;
  return false;
}

function needsBudgetStep(
  profile: ProfileForDiscovery,
  context: CollegeListContext,
  messages?: Array<{ question?: CollegeListMcq }>,
): boolean {
  if (context.scholarship_need || context.budget_constraint || context.annual_budget_inr) {
    return false;
  }
  if (messagesCoverTopic(messages, ["budget", "financial", "scholarship", "aid"])) return false;
  if (profile.financial_aid_importance?.trim()) return false;
  return true;
}

function needsPrioritiesStep(
  context: CollegeListContext,
  messages?: Array<{ question?: CollegeListMcq }>,
): boolean {
  if (context.priorities?.length) return false;
  if (messagesCoverTopic(messages, ["priorit", "matters most"])) return false;
  return true;
}

function needsCareerGoalStep(
  context: CollegeListContext,
  messages?: Array<{ question?: CollegeListMcq }>,
): boolean {
  if (context.career_goal) return false;
  if (messagesCoverTopic(messages, ["career direction", "career goal", "career path"])) return false;
  return true;
}

function needsPlacementStep(
  context: CollegeListContext,
  messages?: Array<{ question?: CollegeListMcq }>,
): boolean {
  if (context.placement_importance) return false;
  if (context.priorities?.some((p) => /internship|placement/i.test(p))) return false;
  if (messagesCoverTopic(messages, ["internship access", "career placement", "placement and internship"])) return false;
  return true;
}

function needsLearningStyleStep(
  context: CollegeListContext,
  messages?: Array<{ question?: CollegeListMcq }>,
): boolean {
  if (context.learning_style) return false;
  if (messagesCoverTopic(messages, ["learning environment", "teaching style", "learning style"])) return false;
  return true;
}

function needsPostgradPlanStep(
  context: CollegeListContext,
  messages?: Array<{ question?: CollegeListMcq }>,
): boolean {
  if (context.postgrad_plan) return false;
  if (messagesCoverTopic(messages, ["after getting your degree", "after your degree", "settle", "stay abroad"])) return false;
  return true;
}

export function countInitialDiscoverySteps(
  profile: ProfileForDiscovery,
  context: CollegeListContext,
): number {
  const merged = mergeProfileIntoDiscoveryContext(context, profile);
  let n = 0;
  if (needsFocusStep(profile, merged, undefined)) n++;
  if (needsCareerGoalStep(merged, undefined)) n++;
  if (needsBudgetStep(profile, merged, undefined)) n++;
  if (needsPlacementStep(merged, undefined)) n++;
  if (needsLearningStyleStep(merged, undefined)) n++;
  if (needsPrioritiesStep(merged, undefined)) n++;
  if (needsPostgradPlanStep(merged, undefined)) n++;
  return Math.max(n, 1);
}

export function countAnsweredDiscoveryQuestions(
  messages: Array<{ role: string; question?: CollegeListMcq }>,
): number {
  let n = 0;
  for (const m of messages) {
    if (m.role !== "assistant" || m.question?.answeredWith === undefined) continue;
    n++;
  }
  return n;
}

export function isLegacyReadyQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return (
    q.includes("ready for") &&
    (q.includes("recommendation") || q.includes("suggestion"))
  );
}

export function resolveTargetCountries(
  profile: ProfileForDiscovery,
  context: CollegeListContext,
): string[] {
  const skip = /no preference|not sure|anywhere|open to all|doesn't matter/i;
  const fromContext = (context.location_preferences ?? []).filter(
    (c) => c?.trim() && !skip.test(c),
  );
  if (fromContext.length > 0) return fromContext;

  const fromProfile = (profile.target_countries ?? []).filter(
    (c): c is string => Boolean(c?.trim()),
  );
  return fromProfile;
}

function normalizeCountryToken(country: string): string {
  const c = country.toLowerCase().trim();
  if (/^(usa|us|u\.s\.|united states)/.test(c)) return "usa";
  if (/^(uk|u\.k\.|united kingdom|britain|england|scotland)/.test(c)) return "uk";
  if (/canada/.test(c)) return "canada";
  if (/germany|deutschland/.test(c)) return "germany";
  if (/singapore/.test(c)) return "singapore";
  if (/australia/.test(c)) return "australia";
  if (/netherlands|holland/.test(c)) return "netherlands";
  if (/india/.test(c)) return "india";
  return c.replace(/[^a-z]/g, "");
}

export function countriesMatch(a: string, b: string): boolean {
  const na = normalizeCountryToken(a);
  const nb = normalizeCountryToken(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function buildRecommendationRequirementsText(
  profile: ProfileForDiscovery,
  context: CollegeListContext,
): string {
  const countries = resolveTargetCountries(profile, context);
  const countryLine =
    countries.length > 0
      ? `- **Geography (mandatory):** Include **at least 1–2 schools from EACH** target country: ${countries.join(", ")}. Never skip an entire country — if fit is weak, include one honest reach there and explain why in honest_assessment.`
      : `- **Geography:** Spread picks across **at least 4 countries** suited to Indian applicants (e.g. USA, UK, Canada, Germany, Singapore). Include **at least 2 schools per country** for your top 3 country fits.`;

  return [
    "## suggest_colleges requirements (MANDATORY)",
    "- All colleges MUST exist in **counselly_colleges** — use search_college_database or the provided shortlist; exact names only.",
    "- Return **10–14 colleges** in one suggest_colleges call (**minimum 10**).",
    countryLine,
    "- **Tier mix:** ~40% reach, ~45% target, **2–3 safety only** (genuinely stronger admission odds for THIS student — keep safeties minimal, not a long safety list).",
    "- Include target-tier schools — not everything should be a reach.",
    "- Match programs to their study focus and stated specializations.",
    "- Use tier: reach | target | safety | exam-cutoff (for India JEE/NEET when relevant).",
    "- Do not repeat colleges already on their saved list.",
    "- **Never invent stats** — acceptance rate, cost, and rankings must come from counselly_colleges.",
    "- web_search is fine for scholarships or recent news; verified college facts must still come from counselly_colleges.",
  ].join("\n");
}

export function validateRecommendationBatch(
  colleges: CollegeRecommendation[],
  targetCountries: string[],
): { valid: boolean; feedback: string } {
  if (colleges.length < 10) {
    return {
      valid: false,
      feedback: `Too few colleges (${colleges.length}). Call suggest_colleges again with **10–14 schools** total, including 2–3 safety-tier picks and coverage of every target country.`,
    };
  }

  const safetyCount = colleges.filter((c) => c.tier === "safety").length;
  if (safetyCount < 2) {
    return {
      valid: false,
      feedback: `Need **2–3 safety-tier** schools (found ${safetyCount}). Add genuine safeties and resubmit the **full** list of 10–14 colleges in one suggest_colleges call.`,
    };
  }

  if (targetCountries.length > 0) {
    const missing = targetCountries.filter(
      (tc) => !colleges.some((c) => countriesMatch(c.country, tc)),
    );
    if (missing.length > 0) {
      return {
        valid: false,
        feedback: `Missing target countries: ${missing.join(", ")}. Add **1–2 schools per missing country** and resubmit the **full** 10–14 list in one suggest_colleges call.`,
      };
    }
  }

  return { valid: true, feedback: "" };
}

export function isRecommendationsConfirmationAnswer(answer: string | string[]): boolean {
  const s = formatAnswerDisplay(answer).toLowerCase();
  return s.includes("show me recommendations") || s.includes("yes — show");
}

/** Discovery finished but recommendations were never fetched (e.g. after reload). */
export function shouldFetchRecommendations(
  profile: ProfileForDiscovery,
  context: CollegeListContext,
  messages: Array<{
    role: "user" | "assistant";
    id: string;
    content: string;
    question?: CollegeListMcq;
    recommendations?: CollegeRecommendation[];
  }>,
): boolean {
  if (context.discovery_completed) return false;
  if (messages.some((m) => m.recommendations?.length)) return false;
  if (getActiveQuestionFromMessages(messages)) return false;
  if (getNextDiscoveryQuestion(profile, context, messages)) return false;
  if (countAnsweredDiscoveryQuestions(messages) === 0) return false;
  return true;
}

export function discoveryQuestionProgress(
  messages: Array<{ role: string; question?: CollegeListMcq }>,
  initialTotalSteps: number,
  hasPendingQuestion: boolean,
): { step: number; total: number; percent: number } {
  const answered = countAnsweredDiscoveryQuestions(messages);
  const total = Math.max(initialTotalSteps, answered + (hasPendingQuestion ? 1 : 0));
  const step = Math.min(answered + (hasPendingQuestion ? 1 : 0), total);
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
  return { step, total, percent };
}

export function patchContextFromMcqAnswer(
  question: string,
  answer: string | string[],
): Partial<CollegeListContext> {
  const q = question.toLowerCase();
  const values = Array.isArray(answer) ? answer : [answer];
  const text = values.join(", ");
  const lower = text.toLowerCase();

  if (q.includes("priorit") || q.includes("matters most")) {
    return { priorities: values, last_updated: new Date().toISOString() };
  }

  if (q.includes("budget") || q.includes("financial") || q.includes("scholarship") || q.includes("aid")) {
    if (lower.includes("essential") || lower.includes("substantial scholarship")) {
      return {
        scholarship_need: "essential",
        budget_constraint: "strict",
        annual_budget_inr: text,
        last_updated: new Date().toISOString(),
      };
    }
    if (lower.includes("partial") || lower.includes("helpful")) {
      return {
        scholarship_need: "helpful",
        budget_constraint: "moderate",
        annual_budget_inr: text,
        last_updated: new Date().toISOString(),
      };
    }
    if (lower.includes("flexible") || lower.includes("₹40") || lower.includes("65 lakh")) {
      return {
        scholarship_need: "not_needed",
        budget_constraint: "flexible",
        annual_budget_inr: text,
        last_updated: new Date().toISOString(),
      };
    }
    return {
      budget_constraint: "moderate",
      annual_budget_inr: text,
      last_updated: new Date().toISOString(),
    };
  }

  // Career direction — must come before "direction" to avoid being mis-classified as study_field
  if (q.includes("career direction") || q.includes("career goal") || q.includes("career path")) {
    return { career_goal: text, last_updated: new Date().toISOString() };
  }

  // Placement / internship importance
  if (q.includes("placement and internship") || q.includes("career placement") || q.includes("internship access")) {
    return { placement_importance: text, last_updated: new Date().toISOString() };
  }

  // Learning environment / style
  if (q.includes("learning environment") || q.includes("learning style") || q.includes("teaching style")) {
    return { learning_style: text, last_updated: new Date().toISOString() };
  }

  // Post-graduation plan
  if (q.includes("after getting your degree") || q.includes("after your degree") || q.includes("settle") || q.includes("stay abroad")) {
    return { postgrad_plan: text, last_updated: new Date().toISOString() };
  }

  if (
    q.includes("focus") ||
    q.includes("within") ||
    q.includes("considering") ||
    q.includes("field") ||
    q.includes("direction")
  ) {
    return {
      study_field: text,
      study_field_decided: true,
      last_updated: new Date().toISOString(),
    };
  }

  return { notes: text, last_updated: new Date().toISOString() };
}

/** Infer study_field from onboarding major when user confirms focus. */
export function inferStudyFieldFromMajor(major: string): string {
  return major.trim();
}

/** Deterministic next question — up to 7–8 steps, then null triggers recommendations. */
export function getNextDiscoveryQuestion(
  profile: ProfileForDiscovery,
  context: CollegeListContext,
  messages?: Array<{ question?: CollegeListMcq }>,
): DiscoveryQuestion | null {
  const merged = mergeProfileIntoDiscoveryContext(context, profile);
  const major = profile.intended_major?.trim();
  const studyField = merged.study_field?.toLowerCase() ?? "";

  // Step 1: Study focus
  if (needsFocusStep(profile, merged, messages)) {
    if (!isMajorDecided(major)) {
      return {
        question: "What areas are you considering?",
        options: [
          "Engineering & Computer Science",
          "Business & Economics",
          "Sciences & Medicine",
          "Arts & Humanities",
          "Still undecided",
        ],
        allowMultiple: false,
      };
    }
    const followUp = major ? MAJOR_FOLLOW_UPS[major] : undefined;
    if (followUp) return followUp;
    return {
      question: `Focus on ${major}?`,
      options: [`Yes — ${major}`, "A related field", "Not sure yet"],
      allowMultiple: false,
    };
  }

  // Step 2: Career direction
  if (needsCareerGoalStep(merged, messages)) {
    const opts = [
      "Industry / tech company or corporate job",
      "Research or academia (PhD path)",
      "Consulting or investment banking",
      "Entrepreneurship / startups",
      "Government, policy, or non-profit",
      "Haven't decided yet",
    ];
    if (
      studyField.includes("medicine") ||
      studyField.includes("healthcare") ||
      studyField.includes("pre-med")
    ) {
      opts[0] = "Clinical practice / medicine";
      opts[1] = "Medical research or academia";
    }
    return {
      question: "What's your career direction after graduation?",
      options: opts,
      allowMultiple: false,
    };
  }

  // Step 3: Budget / financial aid
  if (needsBudgetStep(profile, merged, messages)) {
    return {
      question: "What's your budget for college (per year)?",
      options: [
        "Need substantial scholarships",
        "Moderate (~₹25–40 lakh/year)",
        "Flexible (₹40 lakh+/year)",
        "Prefer not to say",
      ],
      allowMultiple: false,
    };
  }

  // Step 4: Placement / internship importance
  if (needsPlacementStep(merged, messages)) {
    return {
      question: "How important is strong career placement and internship access?",
      options: [
        "Critical — top companies recruiting on campus is a must",
        "Very important — strong alumni network matters",
        "Somewhat important, but academics come first",
        "Not a priority — I'll find opportunities myself",
      ],
      allowMultiple: false,
    };
  }

  // Step 5: Learning environment
  if (needsLearningStyleStep(merged, messages)) {
    return {
      question: "What learning environment suits you best?",
      options: [
        "Small classes with close professor access",
        "Large research university, more self-driven",
        "Project-based and hands-on curriculum",
        "Flexible — happy with any well-structured programme",
      ],
      allowMultiple: false,
    };
  }

  // Step 6: Priorities
  if (needsPrioritiesStep(merged, messages)) {
    const opts = [
      "Academic reputation & rankings",
      "Career outcomes & recruiter access",
      "Cost & scholarships",
      "Research opportunities",
      "Campus life & student community",
    ];
    if (
      studyField.includes("computer") ||
      studyField.includes("engineering") ||
      major === "Engineering & CS"
    ) {
      opts.unshift("Strong CS / engineering department");
    }
    return {
      question: "What matters most to you? (pick all that apply)",
      options: opts,
      allowMultiple: true,
    };
  }

  // Step 7: Post-graduation plan
  if (needsPostgradPlanStep(merged, messages)) {
    return {
      question: "Where do you see yourself after getting your degree?",
      options: [
        "Work abroad long-term (settle in that country)",
        "Return to India after a few years abroad",
        "Open to both — depends on opportunities",
        "Not sure yet",
      ],
      allowMultiple: false,
    };
  }

  return null;
}

export function getActiveQuestionFromMessages(
  messages: StoredCollegeListMessage[],
): CollegeListMcq | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && m.question && m.question.answeredWith === undefined) {
      return m.question;
    }
  }
  return null;
}

export function serializeGuideMessages(
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    question?: CollegeListMcq;
    recommendations?: CollegeRecommendation[];
    actions?: Array<{ text: string; success: boolean }>;
    hidden?: boolean;
    isStreaming?: boolean;
    statusSteps?: unknown[];
  }>,
): StoredCollegeListMessage[] {
  return messages
    .filter((m) => !m.hidden && !m.isStreaming && (m.content || m.question || m.recommendations?.length))
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      ...(m.question ? { question: m.question } : {}),
      ...(m.recommendations?.length ? { recommendations: m.recommendations } : {}),
      ...(m.actions?.length ? { actions: m.actions } : {}),
    }));
}

export function formatMcqAnswerForApi(answer: string | string[]): string {
  return Array.isArray(answer) ? answer.join(", ") : answer;
}

export function formatAnswerDisplay(answer: string | string[]): string {
  return formatMcqAnswerForApi(answer);
}
