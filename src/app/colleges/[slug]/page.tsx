import { notFound } from "next/navigation";
import Link from "next/link";
import { getCollegeBySlug } from "@/lib/colleges-db";
import { Nav } from "@/components/layout/nav";
import { SiteFooter } from "@/components/layout/site-footer";
import type { CollegeRow } from "@/lib/colleges-db";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const college = await getCollegeBySlug(slug);
  if (!college) return { title: "College Not Found — Counselly" };

  return {
    title: `${college.name} — Counselly College Directory`,
    description:
      college.description ??
      `Key stats, admissions data, and programs for ${college.name}. Built for Indian students applying internationally.`,
  };
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | null;
  sub?: string;
}) {
  if (value == null) return null;
  return (
    <div className="bg-canvas border border-hairline rounded-lg p-4">
      <p className="text-xs text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-muted-soft mt-0.5">{sub}</p>}
    </div>
  );
}

// ── SAT Range Bar ─────────────────────────────────────────────────────────────
function ScoreRangeBar({
  label,
  lo,
  hi,
  max,
}: {
  label: string;
  lo: number | null;
  hi: number | null;
  max: number;
}) {
  if (lo == null || hi == null) return null;
  const loP = (lo / max) * 100;
  const hiP = (hi / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs text-muted mb-1">
        <span>{label}</span>
        <span className="font-medium text-body">
          {lo}–{hi}
        </span>
      </div>
      <div className="relative h-2 bg-surface-card rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-primary/30 rounded-full"
          style={{ left: `${loP}%`, width: `${hiP - loP}%` }}
        />
      </div>
    </div>
  );
}

// ── Flag helper ───────────────────────────────────────────────────────────────
const COUNTRY_FLAG: Record<string, string> = {
  USA: "🇺🇸", UK: "🇬🇧", Canada: "🇨🇦", Australia: "🇦🇺",
  Singapore: "🇸🇬", Germany: "🇩🇪", Netherlands: "🇳🇱", "Hong Kong": "🇭🇰",
  Ireland: "🇮🇪", France: "🇫🇷", Switzerland: "🇨🇭", Belgium: "🇧🇪",
  Denmark: "🇩🇰", Japan: "🇯🇵", "South Korea": "🇰🇷", China: "🇨🇳",
  "New Zealand": "🇳🇿", "South Africa": "🇿🇦",
};

function formatCost(usd: number | null): string | null {
  if (usd == null) return null;
  if (usd >= 1000) return `$${(usd / 1000).toFixed(0)}k/yr`;
  return `$${usd}/yr`;
}

function formatEnrollment(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ── Add-to-list CTA ───────────────────────────────────────────────────────────
// We keep this simple: a link that sends user to their dashboard college list.
// If unauthenticated, the dashboard auth guard will redirect to login.
function AddToListCTA({ college }: { college: CollegeRow }) {
  const params = new URLSearchParams({
    add: college.name,
    country: college.country,
  });
  return (
    <Link
      href={`/dashboard/college-list?${params}`}
      className="inline-flex items-center gap-2 bg-primary text-on-primary text-sm font-medium px-5 py-2.5 rounded-md hover:bg-primary-active transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add to my college list
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function CollegeDetailPage({ params }: Props) {
  const { slug } = await params;
  const college = await getCollegeBySlug(slug);
  if (!college) notFound();

  const flag = COUNTRY_FLAG[college.country] ?? "🌐";
  const location = [college.city, college.state_province, college.country]
    .filter(Boolean)
    .join(", ");

  const portalLabel: Record<string, string> = {
    common_app: "Common App",
    coalition: "Coalition App",
    ucas: "UCAS",
    direct: "Direct Application",
    other: "Direct Application",
  };

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-canvas">
        {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
        <div className="border-b border-hairline bg-canvas">
          <div className="mx-auto max-w-5xl px-6 py-3 flex items-center gap-2 text-sm text-muted">
            <Link href="/colleges" className="hover:text-primary transition-colors">
              College Directory
            </Link>
            <span>/</span>
            <span className="text-body truncate">{college.name}</span>
          </div>
        </div>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="bg-surface-dark text-on-dark py-12 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                {college.qs_rank != null && (
                  <span className="inline-block text-xs font-semibold text-on-dark-soft bg-surface-dark-elevated px-3 py-1 rounded-pill border border-white/10 mb-3">
                    QS Rank #{college.qs_rank}{college.qs_rank_year ? ` (${college.qs_rank_year})` : ""}
                  </span>
                )}
                <h1 className="font-display text-4xl md:text-5xl font-normal leading-tight mb-2">
                  <span className="mr-3">{flag}</span>
                  {college.name}
                </h1>
                <p className="text-on-dark-soft text-base">{location}</p>
                {college.college_type && (
                  <p className="text-on-dark-soft text-sm mt-1">
                    {college.control === "public" ? "Public" : college.control === "private" ? "Private" : ""}{" "}
                    {college.college_type === "research_university"
                      ? "Research University"
                      : college.college_type === "liberal_arts"
                      ? "Liberal Arts College"
                      : college.college_type === "technical"
                      ? "Technical University"
                      : college.college_type}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 items-start shrink-0">
                <AddToListCTA college={college} />
                {college.website_url && (
                  <a
                    href={college.website_url.startsWith("http") ? college.website_url : `https://${college.website_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-on-dark-soft hover:text-on-dark transition-colors flex items-center gap-1"
                  >
                    Visit website
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* Tags */}
            {college.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-5">
                {college.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-on-dark-soft bg-surface-dark-elevated px-2.5 py-1 rounded-pill border border-white/10"
                  >
                    {tag.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-5xl px-6 lg:px-8 py-10 space-y-10">

          {/* Description */}
          {college.description && (
            <div>
              <p className="text-body text-base leading-relaxed">{college.description}</p>
            </div>
          )}

          {/* ── Key Stats Grid ─────────────────────────────────────────── */}
          <div>
            <h2 className="text-lg font-semibold text-ink mb-4">Key Stats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <StatCard
                label="Acceptance Rate"
                value={college.acceptance_rate != null ? `${college.acceptance_rate.toFixed(1)}%` : null}
              />
              <StatCard
                label="Annual Tuition"
                value={formatCost(college.annual_tuition_usd)}
              />
              <StatCard
                label="Total Cost"
                value={formatCost(college.annual_cost_usd)}
                sub="Tuition + room + board"
              />
              <StatCard
                label="Undergrad Enrollment"
                value={formatEnrollment(college.undergrad_enrollment)}
              />
              <StatCard
                label="Application Portal"
                value={college.application_portal ? (portalLabel[college.application_portal] ?? college.application_portal) : null}
              />
              {college.early_deadline && (
                <StatCard
                  label="Early Deadline"
                  value={new Date(college.early_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
              )}
              {college.regular_deadline && (
                <StatCard
                  label="Regular Deadline"
                  value={new Date(college.regular_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
              )}
              {college.us_news_rank != null && (
                <StatCard label="US News Rank" value={`#${college.us_news_rank}`} />
              )}
            </div>
          </div>

          {/* ── Quick flags ───────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            {college.intl_financial_aid && (
              <div className="flex items-center gap-2 bg-success/10 border border-success/20 text-success text-sm font-medium px-4 py-2 rounded-lg">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Awards financial aid to international students
                {college.avg_intl_aid_usd != null && (
                  <span className="text-success/70 font-normal">
                    (avg {formatCost(college.avg_intl_aid_usd)})
                  </span>
                )}
              </div>
            )}
            {college.test_optional && (
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-medium px-4 py-2 rounded-lg">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Optional
              </div>
            )}
          </div>

          {/* ── Admissions Profile ──────────────────────────────────────── */}
          {(college.avg_sat_math_25 != null || college.avg_act_25 != null) && (
            <div>
              <h2 className="text-lg font-semibold text-ink mb-4">Admissions Profile</h2>
              <div className="bg-surface-soft border border-hairline rounded-lg p-5 space-y-4">
                {(college.avg_sat_math_25 != null || college.avg_sat_read_25 != null) && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider">SAT Ranges (25th–75th percentile)</p>
                    <ScoreRangeBar
                      label="SAT Math"
                      lo={college.avg_sat_math_25}
                      hi={college.avg_sat_math_75}
                      max={800}
                    />
                    <ScoreRangeBar
                      label="SAT Reading & Writing"
                      lo={college.avg_sat_read_25}
                      hi={college.avg_sat_read_75}
                      max={800}
                    />
                  </div>
                )}
                {college.avg_act_25 != null && (
                  <div className="space-y-2 pt-2 border-t border-hairline">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider">ACT Range</p>
                    <ScoreRangeBar
                      label="ACT Composite"
                      lo={college.avg_act_25}
                      hi={college.avg_act_75}
                      max={36}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Strong Programs ─────────────────────────────────────────── */}
          {college.strong_programs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-ink mb-4">Strong Programs</h2>
              <div className="flex flex-wrap gap-2">
                {college.strong_programs.map((p) => (
                  <span
                    key={p}
                    className="text-sm text-body bg-surface-soft border border-hairline px-3 py-1.5 rounded-md"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Notable Facts (for AI context, also useful for students) ─── */}
          {college.notable_facts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-ink mb-4">Counselly Notes</h2>
              <ul className="space-y-2">
                {college.notable_facts.map((fact, i) => (
                  <li key={i} className="flex gap-3 text-sm text-body">
                    <span className="text-primary mt-0.5 shrink-0">→</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── CTA ─────────────────────────────────────────────────────── */}
          <div className="bg-surface-dark text-on-dark rounded-xl p-8 text-center">
            <h2 className="font-display text-3xl font-normal mb-3">
              Considering {college.name}?
            </h2>
            <p className="text-on-dark-soft text-sm mb-6 max-w-md mx-auto">
              Add it to your Counselly college list and let AI help you build a personalised
              reach/target/safety shortlist based on your profile.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <AddToListCTA college={college} />
              <Link
                href="/colleges"
                className="text-sm text-on-dark-soft hover:text-on-dark transition-colors"
              >
                ← Back to directory
              </Link>
            </div>
          </div>

        </div>
      </main>

      <SiteFooter />
    </>
  );
}
