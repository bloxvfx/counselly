"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  MessageCircle,
  FileText,
  Lightbulb,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { getProfileContext } from "@/lib/profile-context";
import type { ProfileSnapshot } from "@/types/profile-context";

function getPrimaryNudge(
  ctx: ReturnType<typeof getProfileContext>,
  profile: ProfileSnapshot & { grade?: string | null }
): { message: string; href?: string } | null {
  const tests = profile.tests_taken ?? [];
  const countries = ctx.targetCountries;

  if (!profile.academic_score) {
    return { message: "Add your academic score so we can match you with the right colleges.", href: "/dashboard/profile" };
  }
  if (countries.includes("UK") && !tests.some(t => ["IELTS", "TOEFL"].includes(t))) {
    return { message: "UCAS applications need IELTS or TOEFL — plan your test date early.", href: "/dashboard/profile" };
  }
  if (ctx.needsSAT && !tests.some(t => ["SAT", "ACT"].includes(t))) {
    return { message: "Add your SAT or ACT score to strengthen your US applications.", href: "/dashboard/profile" };
  }
  if (ctx.needsEntranceExam && !tests.some(t => ["JEE_MAINS", "JEE_ADVANCED", "NEET"].includes(t))) {
    return { message: "Add your entrance exam score (JEE / NEET) to track your readiness.", href: "/dashboard/profile" };
  }
  return null;
}

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/auth");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("counselly_profiles")
    .select("full_name, grade, target_countries, intended_major, application_cycle, board, academic_score, tests_taken, activities, help_needed")
    .eq("id", user.id)
    .maybeSingle();

  const ctx = getProfileContext(profile as ProfileSnapshot | null);
  const nudge = getPrimaryNudge(ctx, profile as ProfileSnapshot & { grade?: string | null });

  const firstName =
    profile?.full_name?.split(" ")[0] ??
    user.user_metadata?.full_name?.split(" ")[0] ??
    "there";

  const fullName =
    profile?.full_name ??
    user.user_metadata?.full_name ??
    "Student";

  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  const cycle = profile?.application_cycle ?? null;

  const completionEntries = Object.entries(ctx.completionByDestination);
  const overallCompletion = completionEntries.length > 0
    ? Math.round(completionEntries.reduce((sum, [, v]) => sum + v, 0) / completionEntries.length)
    : 25;

  const stages = [
    {
      href: "/dashboard/college-list",
      Icon: BookOpen,
      step: "01",
      headline: "Build your college list",
      detail: "Find universities that match your profile, budget, and goals.",
    },
    {
      href: "/dashboard/essays",
      Icon: FileText,
      step: "02",
      headline: "Draft your essays",
      detail: ctx.targetCountries.includes("UK")
        ? "Common App essay, UCAS personal statement, and supplements."
        : "Personal statement, Common App essay, and supplements.",
    },
    {
      href: "/dashboard/timeline",
      Icon: CalendarDays,
      step: "03",
      headline: "Track deadlines",
      detail: "Stay ahead of application windows, test dates, and financial aid cutoffs.",
    },
  ];

  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:py-12">

        {/* Page title */}
        <div className="mb-8">
          <p className="type-caption-upper text-muted mb-1">Overview</p>
          <h1 className="type-display-md text-ink">
            Welcome back, {firstName}.
          </h1>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">

          {/* ── LEFT: Main content ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">

            {/* Nudge */}
            {nudge && (
              <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3.5">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                <p className="type-body-sm text-body flex-1">{nudge.message}</p>
                {nudge.href && (
                  <Link
                    href={nudge.href}
                    className="shrink-0 type-caption text-primary hover:underline whitespace-nowrap"
                  >
                    Fix it →
                  </Link>
                )}
              </div>
            )}

            {/* Application stages */}
            <div>
              <p className="type-caption-upper text-muted mb-3">Your application</p>
              <div className="flex flex-col gap-2.5">
                {stages.map(({ href, Icon, step, headline, detail }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-4 rounded-lg border border-hairline bg-surface-card px-5 py-4 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                  >
                    <span className="type-caption-upper text-muted/40 tabular-nums w-5 shrink-0 select-none text-xs">
                      {step}
                    </span>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft border border-hairline group-hover:bg-primary/8 group-hover:border-primary/20 transition-all duration-200">
                      <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="type-caption text-ink mb-0.5">{headline}</p>
                      <p className="type-body-sm text-muted line-clamp-1">{detail}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={1.5} />
                  </Link>
                ))}
              </div>
            </div>

            {/* Secondary tools */}
            <div>
              <p className="type-caption-upper text-muted mb-3">Tools</p>
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/dashboard/scholarships"
                  className="group flex items-center gap-3 rounded-lg border border-hairline bg-surface-card px-4 py-3.5 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                >
                  <GraduationCap className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="type-caption text-ink">Scholarships</p>
                    <p className="type-body-sm text-muted truncate">Find funding</p>
                  </div>
                </Link>
                <Link
                  href="/dashboard/chat"
                  className="group flex items-center gap-3 rounded-lg border border-hairline bg-surface-card px-4 py-3.5 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                >
                  <MessageCircle className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="type-caption text-ink">AI Counsellor</p>
                    <p className="type-body-sm text-muted truncate">Ask anything</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Profile card ── */}
          <aside className="w-full lg:w-72 xl:w-80 shrink-0">
            <div className="rounded-lg border border-hairline bg-surface-card overflow-hidden">

              {/* Card header */}
              <div className="px-5 py-5 border-b border-hairline">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="type-caption text-ink font-medium truncate">{fullName}</p>
                    <p className="type-body-sm text-muted truncate mt-0.5" style={{ fontSize: "0.72rem" }}>
                      {user.email}
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/profile"
                  className="mt-3.5 flex items-center gap-1.5 type-caption text-primary hover:underline"
                >
                  <Pencil className="h-3 w-3" strokeWidth={1.5} />
                  Edit Profile
                </Link>
              </div>

              {/* Profile fields */}
              <div className="px-5 py-4 flex flex-col gap-4">

                {cycle && (
                  <div>
                    <p className="type-caption-upper text-muted mb-1" style={{ fontSize: "0.6rem" }}>
                      Application Year
                    </p>
                    <p className="type-body-sm text-ink">{cycle}</p>
                  </div>
                )}

                {ctx.targetCountries.length > 0 && (
                  <div>
                    <p className="type-caption-upper text-muted mb-1" style={{ fontSize: "0.6rem" }}>
                      Target Countries
                    </p>
                    <p className="type-body-sm text-ink">{ctx.targetCountries.join(", ")}</p>
                  </div>
                )}

                {profile?.intended_major && (
                  <div>
                    <p className="type-caption-upper text-muted mb-1" style={{ fontSize: "0.6rem" }}>
                      Intended Major
                    </p>
                    <p className="type-body-sm text-ink">{profile.intended_major}</p>
                  </div>
                )}

                {profile?.board && (
                  <div>
                    <p className="type-caption-upper text-muted mb-1" style={{ fontSize: "0.6rem" }}>
                      Board
                    </p>
                    <p className="type-body-sm text-ink">{profile.board}</p>
                  </div>
                )}

                {profile?.academic_score && (
                  <div>
                    <p className="type-caption-upper text-muted mb-1" style={{ fontSize: "0.6rem" }}>
                      Academic Score
                    </p>
                    <p className="type-body-sm text-ink">{profile.academic_score}</p>
                  </div>
                )}

                {(profile?.tests_taken ?? []).length > 0 && (
                  <div>
                    <p className="type-caption-upper text-muted mb-1.5" style={{ fontSize: "0.6rem" }}>
                      Tests Taken
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(profile?.tests_taken ?? []).map((t: string) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-pill border border-hairline bg-canvas px-2.5 py-0.5 type-caption text-body"
                          style={{ fontSize: "0.68rem" }}
                        >
                          {t.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile completion footer */}
              <div className="px-5 py-4 border-t border-hairline bg-surface-soft">
                <div className="flex items-center justify-between mb-2">
                  <p className="type-caption text-body" style={{ fontSize: "0.72rem" }}>
                    Profile complete
                  </p>
                  <p className="type-caption text-ink tabular-nums" style={{ fontSize: "0.72rem" }}>
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
    </div>
  );
}
