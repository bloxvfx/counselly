"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import type { CollegeRow } from "@/lib/colleges-db";

// ── Country flag emoji helper ─────────────────────────────────────────────────
const COUNTRY_FLAG: Record<string, string> = {
  USA: "🇺🇸",
  UK: "🇬🇧",
  Canada: "🇨🇦",
  Australia: "🇦🇺",
  Singapore: "🇸🇬",
  Germany: "🇩🇪",
  Netherlands: "🇳🇱",
  "Hong Kong": "🇭🇰",
  Ireland: "🇮🇪",
  France: "🇫🇷",
  Switzerland: "🇨🇭",
  Belgium: "🇧🇪",
  Denmark: "🇩🇰",
  Japan: "🇯🇵",
  "South Korea": "🇰🇷",
  China: "🇨🇳",
  "New Zealand": "🇳🇿",
  "South Africa": "🇿🇦",
};

const ALL_COUNTRIES = [
  "USA", "UK", "Canada", "Australia", "Singapore", "Germany",
  "Netherlands", "Hong Kong", "Ireland", "France", "Switzerland",
  "Belgium", "Denmark", "Japan", "South Korea", "China", "New Zealand",
];

const COLLEGE_TYPES = [
  { value: "research_university", label: "Research University" },
  { value: "liberal_arts", label: "Liberal Arts" },
  { value: "technical", label: "Technical / Engineering" },
  { value: "arts", label: "Arts" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Filters = {
  q: string;
  countries: string[];
  college_type: string[];
  max_acceptance_rate: number | null;
  intl_financial_aid: boolean | null;
  test_optional: boolean | null;
};

// ── College Card ──────────────────────────────────────────────────────────────
function CollegeCard({ college }: { college: CollegeRow }) {
  const flag = COUNTRY_FLAG[college.country] ?? "🌐";
  const acceptanceLabel =
    college.acceptance_rate != null
      ? `${college.acceptance_rate.toFixed(1)}% acceptance`
      : null;
  const rankLabel = college.qs_rank != null ? `#${college.qs_rank} QS` : null;
  const tuitionLabel =
    college.annual_tuition_usd != null
      ? `$${(college.annual_tuition_usd / 1000).toFixed(0)}k/yr`
      : null;

  const typeLabel =
    college.college_type === "liberal_arts"
      ? "Liberal Arts"
      : college.college_type === "technical"
      ? "Technical"
      : college.college_type === "research_university"
      ? "Research University"
      : college.college_type ?? "";

  const controlLabel = college.control === "public" ? "Public" : college.control === "private" ? "Private" : null;

  return (
    <Link
      href={`/colleges/${college.slug}`}
      className="group flex flex-col bg-canvas border border-hairline rounded-lg p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <span className="text-lg mr-2" aria-hidden="true">{flag}</span>
          <h3 className="inline text-base font-semibold text-ink group-hover:text-primary transition-colors leading-snug">
            {college.name}
          </h3>
        </div>
        {rankLabel && (
          <span className="shrink-0 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-pill">
            {rankLabel}
          </span>
        )}
      </div>

      {/* Location & Type */}
      <p className="text-sm text-muted mb-3">
        {[college.city, college.state_province, college.country].filter(Boolean).join(", ")}
        {(typeLabel || controlLabel) && (
          <span className="ml-2 text-xs text-muted-soft">
            · {[controlLabel, typeLabel].filter(Boolean).join(" ")}
          </span>
        )}
      </p>

      {/* Stats row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {acceptanceLabel && (
          <span className="inline-flex items-center gap-1 text-xs text-body-strong bg-surface-soft px-2 py-0.5 rounded-md">
            <span className="text-muted-soft">Acceptance</span> {acceptanceLabel.split("%")[0]}%
          </span>
        )}
        {tuitionLabel && (
          <span className="inline-flex items-center gap-1 text-xs text-body-strong bg-surface-soft px-2 py-0.5 rounded-md">
            <span className="text-muted-soft">Tuition</span> {tuitionLabel}
          </span>
        )}
        {college.intl_financial_aid && (
          <span className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-md font-medium">
            Intl Aid Available
          </span>
        )}
        {college.test_optional && (
          <span className="inline-flex items-center text-xs text-muted bg-surface-card px-2 py-0.5 rounded-md">
            Test Optional
          </span>
        )}
      </div>

      {/* Programs */}
      {college.strong_programs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t border-hairline-soft">
          {college.strong_programs.slice(0, 4).map((p) => (
            <span key={p} className="text-xs text-muted bg-surface-soft px-1.5 py-0.5 rounded">
              {p}
            </span>
          ))}
          {college.strong_programs.length > 4 && (
            <span className="text-xs text-muted-soft px-1 py-0.5">
              +{college.strong_programs.length - 4} more
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

// ── Filter Pill ────────────────────────────────────────────────────────────────
function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-sm px-3 py-1.5 rounded-pill border transition-all ${
        active
          ? "bg-primary text-on-primary border-primary font-medium"
          : "bg-canvas text-muted border-hairline hover:border-primary/40 hover:text-body"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main Directory Component ───────────────────────────────────────────────────
export function CollegesDirectoryClient({
  initialColleges,
  initialTotal,
}: {
  initialColleges: CollegeRow[];
  initialTotal: number;
}) {
  const [colleges, setColleges] = useState<CollegeRow[]>(initialColleges);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialTotal > initialColleges.length);
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    q: "",
    countries: [],
    college_type: [],
    max_acceptance_rate: null,
    intl_financial_aid: null,
    test_optional: null,
  });

  const buildUrl = useCallback(
    (f: Filters, pageNum: number) => {
      const params = new URLSearchParams();
      if (f.q) params.set("q", f.q);
      f.countries.forEach((c) => params.append("country", c));
      f.college_type.forEach((t) => params.append("type", t));
      if (f.max_acceptance_rate != null) params.set("max_acceptance_rate", String(f.max_acceptance_rate));
      if (f.intl_financial_aid != null) params.set("intl_aid", String(f.intl_financial_aid));
      if (f.test_optional != null) params.set("test_optional", String(f.test_optional));
      params.set("page", String(pageNum));
      params.set("limit", "24");
      return `/api/colleges?${params}`;
    },
    []
  );

  // Reset and re-fetch when filters change
  useEffect(() => {
    startTransition(async () => {
      try {
        const res = await fetch(buildUrl(filters, 0));
        const data = await res.json();
        setColleges(data.data ?? []);
        setTotal(data.total ?? 0);
        setPage(0);
        setHasMore(data.hasMore ?? false);
      } catch {
        // ignore fetch errors
      }
    });
  }, [filters, buildUrl]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(buildUrl(filters, nextPage));
      const data = await res.json();
      setColleges((prev) => [...prev, ...(data.data ?? [])]);
      setPage(nextPage);
      setHasMore(data.hasMore ?? false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleCountry = (c: string) =>
    setFilters((f) => ({
      ...f,
      countries: f.countries.includes(c) ? f.countries.filter((x) => x !== c) : [...f.countries, c],
    }));

  const toggleType = (t: string) =>
    setFilters((f) => ({
      ...f,
      college_type: f.college_type.includes(t) ? f.college_type.filter((x) => x !== t) : [...f.college_type, t],
    }));

  const hasActiveFilters =
    filters.countries.length > 0 ||
    filters.college_type.length > 0 ||
    filters.max_acceptance_rate != null ||
    filters.intl_financial_aid != null ||
    filters.test_optional != null;

  return (
    <div>
      {/* ── Search + Quick Filters ─────────────────────────────────────────── */}
      <div className="mb-8 space-y-4">
        {/* Search bar */}
        <div className="relative max-w-xl">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-soft pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search colleges (e.g. MIT, Toronto, Imperial…)"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            className="w-full pl-10 pr-4 py-3 bg-canvas border border-hairline rounded-lg text-body text-sm placeholder:text-muted-soft focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

        {/* Country pills */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Country</p>
          <div className="flex flex-wrap gap-2">
            {ALL_COUNTRIES.map((c) => (
              <FilterPill
                key={c}
                active={filters.countries.includes(c)}
                onClick={() => toggleCountry(c)}
              >
                {COUNTRY_FLAG[c] ?? "🌐"} {c}
              </FilterPill>
            ))}
          </div>
        </div>

        {/* Type pills */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Type</p>
          <div className="flex flex-wrap gap-2">
            {COLLEGE_TYPES.map((t) => (
              <FilterPill
                key={t.value}
                active={filters.college_type.includes(t.value)}
                onClick={() => toggleType(t.value)}
              >
                {t.label}
              </FilterPill>
            ))}
          </div>
        </div>

        {/* More filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">More:</p>

          {/* Acceptance rate */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted whitespace-nowrap">Max Acceptance</label>
            <select
              value={filters.max_acceptance_rate ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  max_acceptance_rate: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="text-sm bg-canvas border border-hairline rounded-md px-2 py-1.5 text-body focus:outline-none focus:border-primary/50"
            >
              <option value="">Any</option>
              <option value="10">≤ 10%</option>
              <option value="20">≤ 20%</option>
              <option value="30">≤ 30%</option>
              <option value="50">≤ 50%</option>
            </select>
          </div>

          <FilterPill
            active={filters.intl_financial_aid === true}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                intl_financial_aid: f.intl_financial_aid === true ? null : true,
              }))
            }
          >
            Intl Aid Available
          </FilterPill>

          <FilterPill
            active={filters.test_optional === true}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                test_optional: f.test_optional === true ? null : true,
              }))
            }
          >
            Test Optional
          </FilterPill>

          {hasActiveFilters && (
            <button
              onClick={() =>
                setFilters({
                  q: "",
                  countries: [],
                  college_type: [],
                  max_acceptance_rate: null,
                  intl_financial_aid: null,
                  test_optional: null,
                })
              }
              className="text-sm text-muted hover:text-error transition-colors ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Results count ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted">
          {isPending ? (
            <span className="inline-block w-20 h-4 bg-surface-card rounded animate-pulse" />
          ) : (
            <>
              <span className="font-semibold text-body">{total.toLocaleString()}</span>{" "}
              {total === 1 ? "college" : "colleges"} found
            </>
          )}
        </p>
      </div>

      {/* ── College Grid ──────────────────────────────────────────────────── */}
      {isPending ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-48 bg-surface-soft rounded-lg animate-pulse" />
          ))}
        </div>
      ) : colleges.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-2xl mb-2">🎓</p>
          <p className="text-body font-medium">No colleges found</p>
          <p className="text-muted text-sm mt-1">Try adjusting your filters or search term.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {colleges.map((college) => (
              <CollegeCard key={college.id} college={college} />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-6 py-2.5 bg-canvas border border-hairline rounded-lg text-sm font-medium text-body hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50"
              >
                {isLoadingMore ? "Loading…" : `Load more (${total - colleges.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
