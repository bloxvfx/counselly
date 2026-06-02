import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getContextProfile, requireUser } from "@/lib/supabase/cached";
import { getProfileContext } from "@/lib/profile-context";
import type { ProfileSnapshot } from "@/types/profile-context";
import { cn } from "@/lib/utils";

type CollegeRow = {
  id: string;
  college_name: string;
  country: string;
  application_deadline: string | null;
  portal_name: string | null;
  portal_link: string | null;
  status: string;
  tier: string | null;
};

function daysUntil(deadline: string): number {
  const d = new Date(deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function deadlineColor(days: number) {
  if (days < 0) return "text-muted";
  if (days < 14) return "text-error";
  if (days < 30) return "text-warning";
  return "text-success";
}

function deadlineLabel(days: number) {
  if (days < 0) return "Passed";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

type Milestone = {
  label: string;
  detail: string;
};

function generateMilestones(
  ctx: ReturnType<typeof getProfileContext>,
): Milestone[] {
  const milestones: Milestone[] = [];

  if (ctx.needsRecs) {
    milestones.push({
      label: "Request recommendation letters",
      detail:
        "Give recommenders at least 6–8 weeks notice before your earliest deadline.",
    });
  }
  if (ctx.needsLanguageTest) {
    milestones.push({
      label: "Book your language test",
      detail:
        "IELTS/TOEFL scores typically take 2–3 weeks to arrive. Register early.",
    });
  }
  if (ctx.needsSAT) {
    milestones.push({
      label: "Register for SAT/ACT",
      detail:
        "Scores are sent directly to universities — allow 3–4 weeks processing time.",
    });
  }
  if (ctx.needsEntranceExam) {
    milestones.push({
      label: "Track JEE / NEET application window",
      detail: "Registration opens ~6 months before the exam date.",
    });
  }
  if (ctx.needsEssays) {
    milestones.push({
      label: "Start your Common App essay",
      detail:
        "The personal statement takes 4–6 drafts. Start at least 3 months before your earliest deadline.",
    });
  }
  if (ctx.targetCountries.includes("UK")) {
    milestones.push({
      label: "Complete UCAS personal statement",
      detail:
        "4,000 characters. Start early — most counsellors recommend 3+ months of drafting.",
    });
  }

  return milestones;
}

const COUNTRY_FLAGS: Record<string, string> = {
  USA: "🇺🇸",
  UK: "🇬🇧",
  Canada: "🇨🇦",
  Australia: "🇦🇺",
  Singapore: "🇸🇬",
  Germany: "🇩🇪",
  Netherlands: "🇳🇱",
  India: "🇮🇳",
};

export async function TimelineData() {
  const { supabase, user } = await requireUser();

  const [collegesResult, profile] = await Promise.all([
    supabase
      .from("counselly_college_list")
      .select(
        "id, college_name, country, application_deadline, portal_name, portal_link, status, tier",
      )
      .eq("user_id", user.id)
      .not("application_deadline", "is", null)
      .order("application_deadline", { ascending: true }),
    getContextProfile(),
  ]);

  const colleges = (collegesResult.data ?? []) as CollegeRow[];
  const ctx = getProfileContext(profile as ProfileSnapshot | null);

  const upcoming = colleges.filter((c) => {
    const days = daysUntil(c.application_deadline!);
    return days >= -7;
  });
  const passed = colleges.filter((c) => daysUntil(c.application_deadline!) < -7);

  const milestones = generateMilestones(ctx);

  return (
    <>
      {milestones.length > 0 && (
        <div className="mb-8">
          <p className="type-caption-upper text-muted mb-3">Action items</p>
          <div className="flex flex-col gap-2">
            {milestones.map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/5 px-4 py-3.5"
              >
                <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-primary/15 mt-0.5">
                  <span
                    className="type-caption text-primary"
                    style={{ fontSize: "0.6rem" }}
                  >
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="type-caption text-ink">{m.label}</p>
                  <p className="type-body-sm text-muted mt-0.5">{m.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {colleges.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-surface-card px-6 py-12 text-center">
          <CalendarDays
            className="h-8 w-8 text-muted mx-auto mb-3"
            strokeWidth={1.5}
          />
          <p className="type-caption text-ink mb-1">No deadlines yet</p>
          <p className="type-body-sm text-muted mb-4">
            Add colleges to your list with application deadlines to see your
            timeline here.
          </p>
          <Link
            href="/dashboard/college-list"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 type-caption text-on-primary hover:bg-primary-active transition-colors"
          >
            Go to college list
          </Link>
        </div>
      ) : (
        <div>
          {upcoming.length > 0 && (
            <>
              <p className="type-caption-upper text-muted mb-3">
                Upcoming deadlines
              </p>
              <div className="rounded-lg border border-hairline bg-surface-card overflow-hidden mb-6">
                <div className="divide-y divide-hairline">
                  {upcoming.map((c) => {
                    const days = daysUntil(c.application_deadline!);
                    const flag = COUNTRY_FLAGS[c.country] ?? "🌍";
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-4 px-5 py-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">
                              {flag}
                            </span>
                            <p className="type-caption text-ink">
                              {c.college_name}
                            </p>
                            {c.portal_name && (
                              <span
                                className="type-caption text-muted"
                                style={{ fontSize: "0.68rem" }}
                              >
                                via {c.portal_name}
                              </span>
                            )}
                          </div>
                          <p className="type-body-sm text-muted mt-0.5">
                            {formatDate(c.application_deadline!)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={cn(
                              "type-caption tabular-nums font-medium",
                              deadlineColor(days),
                            )}
                          >
                            {deadlineLabel(days)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {passed.length > 0 && (
            <>
              <p className="type-caption-upper text-muted mb-3">
                Past deadlines
              </p>
              <div className="rounded-lg border border-hairline bg-surface-card overflow-hidden opacity-60">
                <div className="divide-y divide-hairline">
                  {passed.map((c) => {
                    const flag = COUNTRY_FLAGS[c.country] ?? "🌍";
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-4 px-5 py-3.5"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">
                              {flag}
                            </span>
                            <p className="type-caption text-ink">
                              {c.college_name}
                            </p>
                          </div>
                          <p className="type-body-sm text-muted mt-0.5">
                            {formatDate(c.application_deadline!)}
                          </p>
                        </div>
                        <p className="type-body-sm text-muted shrink-0">
                          Passed
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
