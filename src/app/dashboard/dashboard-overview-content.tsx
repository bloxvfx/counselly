/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "#cc785c",
  "#2D7FC1",
  "#5db8a6",
  "#e8a55a",
  "#6d597a",
  "#386641",
  "#5c54a4",
  "#b76d68",
  "#22333b",
] as const;

function getDeterministicAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

import {
  Lightbulb,
  Pencil,
} from "lucide-react";
import { requireUser } from "@/lib/supabase/cached";
import { getProfileContext } from "@/lib/profile-context";
import type { ProfileSnapshot } from "@/types/profile-context";
import { DashboardNextSteps } from "./dashboard-next-steps";
import { DashboardTaskList, type DashboardTask } from "./dashboard-task-list";

type DashboardTestRow = {
  id: string;
  test_name: string;
  status: string;
  total_score: string | null;
};

function isTestCompleted(status: string): boolean {
  return status === "completed" || status === "taken";
}

function formatDashboardTestLabel(test: DashboardTestRow): string {
  if (!test.total_score?.trim()) return test.test_name;

  const [scorePart, maxPart] = test.total_score.includes(" / ")
    ? test.total_score.split(" / ").map((s) => s.trim())
    : [test.total_score.trim(), null];

  if (isTestCompleted(test.status)) {
    return maxPart
      ? `${test.test_name} (${scorePart} / ${maxPart})`
      : `${test.test_name} (${scorePart})`;
  }

  if (scorePart) {
    return `${test.test_name} (${scorePart} target)`;
  }

  return test.test_name;
}

function getTestsSectionTitle(tests: DashboardTestRow[]): string {
  if (tests.length === 0) return "Tests";
  const allCompleted = tests.every((t) => isTestCompleted(t.status));
  return allCompleted ? `Tests Taken (${tests.length})` : "Tests";
}

function getPrimaryNudge(
  ctx: ReturnType<typeof getProfileContext>,
  profile: ProfileSnapshot & { grade?: string | null },
): { message: string; href?: string } | null {
  const tests = profile.tests_taken ?? [];
  const countries = ctx.targetCountries;

  if (!profile.academic_score) {
    return {
      message:
        "Add your academic score so we can match you with the right colleges.",
      href: "/profile/academics",
    };
  }
  if (
    countries.includes("UK") &&
    !tests.some((t) => ["IELTS", "TOEFL"].includes(t))
  ) {
    return {
      message:
        "UCAS applications need IELTS or TOEFL — plan your test date early.",
      href: "/profile/testing",
    };
  }
  if (ctx.needsSAT && !tests.some((t) => ["SAT", "ACT"].includes(t))) {
    return {
      message: "Add your SAT or ACT score to strengthen your US applications.",
      href: "/profile/testing",
    };
  }
  if (
    ctx.needsEntranceExam &&
    !tests.some((t) => ["JEE_MAINS", "JEE_ADVANCED", "NEET"].includes(t))
  ) {
    return {
      message:
        "Add your entrance exam score (JEE / NEET) to track your readiness.",
      href: "/profile/testing",
    };
  }
  return null;
}

export async function DashboardOverviewContent() {
  const { supabase, user } = await requireUser();

  const [
    profileResult,
    activitiesResult,
    testScoresResult,
    honorsResult,
    collegeListResult,
    planItemsResult,
    categoriesResult,
  ] = await Promise.all([
    supabase
      .from("counselly_profiles")
      .select(
        "full_name, grade, target_countries, intended_major, application_cycle, board, academic_score, score_type, tests_taken, activities, help_needed, subject_scores",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("counselly_activities")
      .select("id, activity_type, name, organization, position, description, sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("counselly_test_scores")
      .select("id, test_name, status, total_score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("counselly_honors")
      .select("id, title, field, level, status, award")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("counselly_college_list")
      .select("id")
      .eq("user_id", user.id),
    supabase
      .from("counselly_plan_items")
      .select("id, title, status, due_date, type, priority, category_id, created_at")
      .eq("user_id", user.id),
    supabase
      .from("counselly_plan_categories")
      .select("id, name, color")
      .eq("user_id", user.id),
  ]);

  const profile = profileResult.data;
  const activitiesData = activitiesResult.data ?? [];
  const testScoresData = testScoresResult.data ?? [];
  const honorsData = honorsResult.data ?? [];
  const collegeListData = collegeListResult.data ?? [];
  const planItemsData = planItemsResult.data ?? [];
  const categoriesData = categoriesResult.data ?? [];

  const topActivities = activitiesData.slice(0, 3);

  const structuredTests = testScoresData as DashboardTestRow[];
  const displayTests =
    structuredTests.length > 0
      ? structuredTests.map(formatDashboardTestLabel)
      : (profile?.tests_taken ?? []).map((t: string) => t.replace(/_/g, " "));
  const testsSectionTitle =
    structuredTests.length > 0
      ? getTestsSectionTitle(structuredTests)
      : displayTests.length > 0
        ? `Tests Taken (${displayTests.length})`
        : "Tests";

  const subjectScores = profile?.subject_scores as Record<
    string,
    { subjects?: { score: string; max: string; subject_name: string }[] }
  > | null;
  const gradeAverages: { grade: string; avg: string }[] = [];

  if (subjectScores) {
    const gradeKeys = ["9", "10", "11", "12"];
    gradeKeys.forEach((g) => {
      const gradeEntry = subjectScores[g];
      const subjects = gradeEntry?.subjects ?? [];
      const validSubjects = subjects.filter(
        (s) =>
          s.score &&
          s.max &&
          !isNaN(parseFloat(s.score)) &&
          !isNaN(parseFloat(s.max)) &&
          parseFloat(s.max) > 0
      );
      if (validSubjects.length > 0) {
        const avg =
          validSubjects.reduce(
            (sum: number, s) =>
              sum + (parseFloat(s.score) / parseFloat(s.max)) * 100,
            0
          ) / validSubjects.length;
        gradeAverages.push({
          grade: `Grade ${g}`,
          avg: `${avg.toFixed(1)}%`,
        });
      }
    });
  }

  const ctx = getProfileContext(profile as ProfileSnapshot | null);
  const nudge = getPrimaryNudge(
    ctx,
    profile as ProfileSnapshot & { grade?: string | null },
  );

  // 1. Google Avatar (if logged in with Google)
  const isGoogle =
    user.app_metadata?.provider === "google" ||
    user.identities?.some((id) => id.provider === "google");
  const googleAvatarUrl = isGoogle
    ? user.user_metadata?.avatar_url || user.user_metadata?.picture
    : null;

  // 2. Fetch Lerno profile details (full name and avatar url) as a fallback
  let lernoFullName = null;
  let lernoAvatarUrl = null;

  if (!profile?.full_name?.trim() || !googleAvatarUrl) {
    try {
      const { data: lernoProfile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      lernoFullName = lernoProfile?.full_name;
      lernoAvatarUrl = lernoProfile?.avatar_url;
    } catch (e) {
      console.error("Failed to fetch Lerno details in dashboard overview:", e);
    }
  }

  const avatarUrl = googleAvatarUrl || lernoAvatarUrl;
  const avatarBgColor = getDeterministicAvatarColor(user.id);

  // Resolve display name using falsy check (||) so empty string "" correctly falls back
  const fullName =
    profile?.full_name?.trim() ||
    lernoFullName?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    user.user_metadata?.name?.trim() ||
    user.email?.split("@")[0] ||
    "Student";

  const firstName = fullName.split(" ")[0] || "there";

  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "S";

  const cycle = profile?.application_cycle ?? null;

  const completionEntries = Object.entries(ctx.completionByDestination);
  const overallCompletion =
    completionEntries.length > 0
      ? Math.round(
          completionEntries.reduce((sum, [, v]) => sum + v, 0) /
            completionEntries.length,
        )
      : 25;

  // Next Steps Completion Flags
  const hasAcademics =
    !!profile?.academic_score ||
    gradeAverages.length > 0 ||
    (!!profile?.subject_scores && Object.keys(profile.subject_scores).length > 0);
  const hasActivities = activitiesData.length > 0;
  const hasTests =
    testScoresData.length > 0 ||
    (profile?.tests_taken ?? []).length > 0;
  const hasHonors = honorsData.length > 0;
  const hasCollegeList = collegeListData.length > 0;
  const hasPlan = planItemsData.length > 0;

  // Sort plan items (prioritizing tasks, but including any)
  // 1. Incomplete first (not_started, in_progress, blocked), completed last
  // 2. Critical > High > Medium > Low
  // 3. Soonest due date first, then no due date
  // 4. For completed items, show the most recently created/updated first
  const sortedTasks = [...planItemsData].sort((a, b) => {
    const aDone = a.status === "done" || a.status === "cancelled";
    const bDone = b.status === "done" || b.status === "cancelled";

    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;

    if (!aDone && !bDone) {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aWeight = priorityWeight[a.priority as keyof typeof priorityWeight] || 1;
      const bWeight = priorityWeight[b.priority as keyof typeof priorityWeight] || 1;
      if (aWeight !== bWeight) return bWeight - aWeight;

      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
    } else {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    return 0;
  });

  const displayTasks = sortedTasks.slice(0, 5) as DashboardTask[];

  return (
    <div className="animate-premium-reveal">
      <div className="mb-6 sm:mb-8">
        <p className="type-caption-upper text-muted mb-1 animate-premium-reveal stagger-1">Overview</p>
        <h1 className="type-display-md text-ink animate-premium-reveal stagger-2">Welcome back, {firstName}.</h1>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex-1 min-w-0 flex flex-col gap-8">
          {nudge && (
            <div className="flex flex-col gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-3 animate-premium-reveal stagger-2">
              <Lightbulb
                className="h-4 w-4 shrink-0 text-primary sm:mt-0.5"
                strokeWidth={1.5}
              />
              <p className="type-body-sm flex-1 text-body">{nudge.message}</p>
              {nudge.href && (
                <Link
                  href={nudge.href}
                  className="type-caption shrink-0 text-primary hover:underline sm:whitespace-nowrap"
                >
                  Fix it →
                </Link>
              )}
            </div>
          )}

          {/* Next Steps Section */}
          <div>
            <p className="type-caption-upper text-muted mb-3 animate-premium-reveal stagger-2">
              Next Steps
            </p>
            <DashboardNextSteps
              hasAcademics={hasAcademics}
              hasActivities={hasActivities}
              hasTests={hasTests}
              hasHonors={hasHonors}
              hasCollegeList={hasCollegeList}
              hasPlan={hasPlan}
            />
          </div>

          {/* Tasks Section */}
          <div>
            <p className="type-caption-upper text-muted mb-3 animate-premium-reveal stagger-3">
              Tasks
            </p>
            <DashboardTaskList
              initialTasks={displayTasks}
              categories={categoriesData}
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-72 xl:w-80 shrink-0 animate-premium-reveal stagger-3">
          <div className="rounded-lg border border-hairline bg-surface-card overflow-hidden">
            <div className="px-5 py-5 border-b border-hairline">
              <div className="flex items-start gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="h-11 w-11 shrink-0 rounded-full object-cover border border-hairline transition-transform hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105"
                    style={{ backgroundColor: avatarBgColor }}
                  >
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="truncate text-sm font-semibold text-ink">
                    {fullName}
                  </p>
                  <p
                    className="truncate text-[11px] text-muted-soft mt-0.5"
                  >
                    {user.email}
                  </p>
                </div>
              </div>
              <Link
                href="/profile/academics"
                className="mt-3.5 flex items-center gap-1.5 type-caption text-primary hover:underline"
              >
                <Pencil className="h-3 w-3" strokeWidth={1.5} />
                Edit Profile
              </Link>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              {cycle && (
                <div>
                  <p
                    className="type-caption-upper text-muted mb-1"
                    style={{ fontSize: "0.6rem" }}
                  >
                    Application Year
                  </p>
                  <p className="type-body-sm text-ink">{cycle}</p>
                </div>
              )}

              {ctx.targetCountries.length > 0 && (
                <div>
                  <p
                    className="type-caption-upper text-muted mb-1"
                    style={{ fontSize: "0.6rem" }}
                  >
                    Target Countries
                  </p>
                  <p className="type-body-sm text-ink">
                    {ctx.targetCountries.join(", ")}
                  </p>
                </div>
              )}

              {profile?.intended_major && (
                <div>
                  <p
                    className="type-caption-upper text-muted mb-1"
                    style={{ fontSize: "0.6rem" }}
                  >
                    Intended Major
                  </p>
                  <p className="type-body-sm text-ink">
                    {profile.intended_major}
                  </p>
                </div>
              )}

              {profile?.board && (
                <div>
                  <p
                    className="type-caption-upper text-muted mb-1"
                    style={{ fontSize: "0.6rem" }}
                  >
                    Board
                  </p>
                  <p className="type-body-sm text-ink">{profile.board}</p>
                </div>
              )}

              {(gradeAverages.length > 0 || profile?.academic_score) && (
                <div>
                  <Link
                    href="/profile/academics"
                    className="group/item flex items-center justify-between mb-1.5"
                  >
                    <span
                      className="type-caption-upper text-muted group-hover/item:text-primary transition-colors"
                      style={{ fontSize: "0.6rem" }}
                    >
                      Academic Scores
                    </span>
                    <span className="text-[10px] text-primary opacity-0 group-hover/item:opacity-100 transition-opacity font-medium">
                      Edit →
                    </span>
                  </Link>
                  {gradeAverages.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {gradeAverages.map((ga) => (
                        <div key={ga.grade} className="flex justify-between items-center text-left py-0.5">
                          <span className="text-xs text-ink font-semibold">{ga.avg}</span>
                          <span className="text-xs text-muted font-medium">{ga.grade}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="type-body-sm text-ink font-semibold">
                      {profile?.academic_score}
                      {profile?.score_type === "percentage" || !profile?.score_type ? "%" : ""}
                    </p>
                  )}
                </div>
              )}

              {displayTests.length > 0 && (
                <div>
                  <Link
                    href="/profile/testing"
                    className="group/item flex items-center justify-between mb-2"
                  >
                    <span
                      className="type-caption-upper text-muted group-hover/item:text-primary transition-colors"
                      style={{ fontSize: "0.6rem" }}
                    >
                      {testsSectionTitle}
                    </span>
                    <span className="text-[10px] text-primary opacity-0 group-hover/item:opacity-100 transition-opacity font-medium">
                      Manage →
                    </span>
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    {displayTests.map((label: string, index: number) => (
                      <span
                        key={structuredTests[index]?.id ?? label}
                        className="inline-flex items-center rounded-pill border border-hairline bg-canvas px-2.5 py-0.5 text-[0.68rem] text-body font-medium"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activitiesData.length > 0 && (
                <div>
                  <Link
                    href="/profile/activities"
                    className="group/item flex items-center justify-between mb-2"
                  >
                    <span
                      className="type-caption-upper text-muted group-hover/item:text-primary transition-colors"
                      style={{ fontSize: "0.6rem" }}
                    >
                      Activities ({activitiesData.length})
                    </span>
                    <span className="text-[10px] text-primary opacity-0 group-hover/item:opacity-100 transition-opacity font-medium">
                      Manage →
                    </span>
                  </Link>
                  <div className="flex flex-col gap-2">
                    {topActivities.map((act) => (
                      <div
                        key={act.id}
                        className="rounded bg-canvas/40 border border-hairline/60 p-2.5 text-left transition-colors hover:bg-canvas/80"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-xs font-semibold text-ink truncate leading-tight">
                            {act.name}
                          </p>
                          <span className="shrink-0 inline-flex items-center rounded-pill bg-primary/8 px-1.5 py-0.5 text-[9px] font-medium text-primary uppercase tracking-wider">
                            {act.activity_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        {act.position && (
                          <p className="text-[10px] text-body font-medium mt-0.5 truncate">
                            {act.position}
                            {act.organization && ` · ${act.organization}`}
                          </p>
                        )}
                        {act.description && (
                          <p className="text-[10px] text-muted line-clamp-2 mt-1 leading-snug">
                            {act.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {honorsData.length > 0 && (
                <div>
                  <Link
                    href="/profile/honors"
                    className="group/item flex items-center justify-between mb-2"
                  >
                    <span
                      className="type-caption-upper text-muted group-hover/item:text-primary transition-colors"
                      style={{ fontSize: "0.6rem" }}
                    >
                      Honors ({honorsData.length})
                    </span>
                    <span className="text-[10px] text-primary opacity-0 group-hover/item:opacity-100 transition-opacity font-medium">
                      Manage →
                    </span>
                  </Link>
                  <div className="flex flex-col gap-1.5">
                    {honorsData.slice(0, 3).map((h) => (
                      <div
                        key={h.id}
                        className="rounded bg-canvas/40 border border-hairline/60 p-2.5 transition-colors hover:bg-canvas/80"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-xs font-semibold text-ink truncate leading-tight">
                            {h.title}
                          </p>
                          {h.status && (
                            <span className={cn(
                              "shrink-0 inline-flex items-center rounded-pill px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                              h.status === "won" ? "bg-success/10 text-success" :
                              h.status === "placed" ? "bg-primary/10 text-primary" :
                              h.status === "participated" ? "bg-ink/8 text-muted" :
                              "bg-warning/10 text-warning"
                            )}>
                              {h.status}
                            </span>
                          )}
                        </div>
                        {(h.field || h.level) && (
                          <p className="text-[10px] text-body font-medium mt-0.5 truncate">
                            {[h.field, h.level ? h.level.charAt(0).toUpperCase() + h.level.slice(1) : null].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {h.award && (
                          <p className="text-[10px] text-muted mt-0.5 truncate">{h.award}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-hairline bg-surface-soft">
              <div className="flex items-center justify-between mb-2">
                <p className="type-caption text-body" style={{ fontSize: "0.72rem" }}>
                  Profile complete
                </p>
                <p
                  className="type-caption text-ink tabular-nums"
                  style={{ fontSize: "0.72rem" }}
                >
                  {overallCompletion}%
                </p>
              </div>
              <div className="h-1.5 rounded-pill bg-surface-cream-strong overflow-hidden">
                <div
                  className="h-full rounded-pill bg-primary transition-all duration-500"
                  style={{ width: `${overallCompletion}%` }}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
