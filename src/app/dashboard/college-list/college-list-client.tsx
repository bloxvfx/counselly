"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Plus, Trash2, X, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/z-index";
import {
  shouldAutoStartDiscovery,
  type CollegeListContext,
  type ProfileForDiscovery,
  type StoredCollegeListMessage,
} from "@/lib/college-list-context";
import { addCollege, deleteCollege } from "./actions";
import { CollegeListGuide } from "./college-list-guide";

export type CollegeRow = {
  id: string;
  college_name: string;
  country: string;
  program: string | null;
  tier: string | null;
  status: string;
  application_deadline: string | null;
  portal_name: string | null;
};

const COUNTRY_SELECT_OPTIONS = [
  { value: "USA", label: "🇺🇸  United States" },
  { value: "UK", label: "🇬🇧  United Kingdom" },
  { value: "Canada", label: "🇨🇦  Canada" },
  { value: "Australia", label: "🇦🇺  Australia" },
  { value: "Singapore", label: "🇸🇬  Singapore" },
  { value: "Germany", label: "🇩🇪  Germany" },
  { value: "Netherlands", label: "🇳🇱  Netherlands" },
  { value: "India", label: "🇮🇳  India" },
  { value: "France", label: "🇫🇷  France" },
  { value: "Other", label: "Other" },
];

const TIER_SELECT_OPTIONS = [
  { value: "reach", label: "Reach" },
  { value: "target", label: "Target" },
  { value: "safety", label: "Safety" },
  { value: "exam-cutoff", label: "Exam Cutoff" },
];

const TIER_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  reach: { label: "Reach", color: "bg-error/8 text-error border-error/20", dot: "bg-error" },
  target: { label: "Target", color: "bg-warning/8 text-warning border-warning/20", dot: "bg-warning" },
  safety: { label: "Safety", color: "bg-success/8 text-success border-success/20", dot: "bg-success" },
  "exam-cutoff": {
    label: "Exam Cutoff",
    color: "bg-primary/8 text-primary border-primary/20",
    dot: "bg-primary",
  },
};


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

const inputCls =
  "h-9 w-full rounded-md border border-hairline bg-canvas px-3 type-body-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40";

/** Matches the ProfileCustomSelect style from the profile page. */
function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-9 w-full flex items-center justify-between rounded-md border border-hairline bg-canvas px-3 type-body-sm hover:border-primary/30 transition-colors"
      >
        <span className={selected ? "text-ink" : "text-muted"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted shrink-0 transition-transform duration-150",
            open && "rotate-180",
          )}
          strokeWidth={1.5}
        />
      </button>
      {open && (
        <div
          style={{ zIndex: Z_INDEX.dropdown }}
          className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-hairline bg-canvas shadow-lg overflow-hidden flex flex-col"
        >
          <div className="overflow-y-auto py-1 max-h-52">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 type-body-sm transition-colors text-left",
                  o.value === value
                    ? "text-primary bg-primary/5 font-medium"
                    : "text-ink hover:bg-surface-soft",
                )}
              >
                {o.label}
                {o.value === value && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={2} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type CollegeSuggestion = { name: string; country: string; city: string | null };

/** Combobox that searches counselly_colleges as the user types. */
function CollegeCombobox({
  value,
  onChange,
  onSelectSuggestion,
}: {
  value: string;
  onChange: (name: string) => void;
  onSelectSuggestion: (suggestion: CollegeSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<CollegeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      const t = setTimeout(() => { setSuggestions([]); setOpen(false); }, 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/colleges?q=${encodeURIComponent(q)}&limit=8`)
        .then((r) => r.json())
        .then((data) => {
          const results: CollegeSuggestion[] = (data.data ?? []).map(
            (c: { name: string; country: string; city: string | null }) => ({
              name: c.name,
              country: c.country,
              city: c.city,
            }),
          );
          setSuggestions(results);
          setOpen(results.length > 0);
        })
        .catch(() => setOpen(false))
        .finally(() => setLoading(false));
    }, 150);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="e.g. MIT, Oxford, IIT Delhi…"
          className={inputCls}
          autoComplete="off"
          autoFocus
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 rounded-full border-2 border-hairline border-t-primary animate-spin" />
          </div>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 w-full z-50 rounded-lg border border-hairline bg-canvas shadow-lg overflow-hidden">
          <div className="py-1 max-h-52 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelectSuggestion(s);
                  setSuggestions([]);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 type-body-sm text-left text-ink hover:bg-surface-soft transition-colors"
              >
                <span className="truncate">{s.name}</span>
                <span className="text-muted shrink-0 ml-3 text-[0.72rem]">
                  {COUNTRY_FLAGS[s.country] ?? "🌍"} {s.country}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  const days = daysUntil(deadline);
  if (days === null) return null;
  if (days < 0) return <span className="type-body-sm text-muted">Passed</span>;
  const cls = days < 14 ? "text-error" : days < 30 ? "text-warning" : "text-muted";
  return <span className={cn("type-body-sm tabular-nums", cls)}>{days}d left</span>;
}

function CollegeCard({
  college,
  onDelete,
}: {
  college: CollegeRow;
  onDelete: () => void;
}) {
  const tierCfg = TIER_CONFIG[college.tier ?? ""];
  const flag = COUNTRY_FLAGS[college.country] ?? "🌍";

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 group transition-all duration-300 hover:bg-surface-soft/60">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-xl leading-none shrink-0">{flag}</span>
        <div className="min-w-0">
          <p className="type-body-sm font-medium text-ink leading-snug truncate">
            {college.college_name}
          </p>
          <p className="type-body-sm text-muted mt-0.5 truncate">
            {[college.program, college.country].filter(Boolean).join(" · ")}
          </p>
          {college.application_deadline && (
            <DeadlineBadge deadline={college.application_deadline} />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {tierCfg && (
          <span
            className={cn("rounded-pill px-2.5 py-1 border font-medium", tierCfg.color)}
            style={{ fontSize: "0.65rem", letterSpacing: "0.02em" }}
          >
            {tierCfg.label}
          </span>
        )}
        <button
          onClick={onDelete}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-muted/40 hover:text-error hover:bg-error/8 transition-all duration-300 opacity-0 group-hover:opacity-100"
          aria-label="Remove college"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function TierSection({
  tier,
  colleges,
  onDelete,
}: {
  tier: keyof typeof TIER_CONFIG;
  colleges: CollegeRow[];
  onDelete: (id: string) => void;
}) {
  const cfg = TIER_CONFIG[tier];
  if (colleges.length === 0) return null;

  return (
    <div className="rounded-xl border border-hairline bg-surface-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-hairline">
        <span
          className={cn("rounded-pill px-2.5 py-0.5 border font-medium", cfg.color)}
          style={{ fontSize: "0.65rem", letterSpacing: "0.02em" }}
        >
          {cfg.label}
        </span>
        <span className="type-body-sm text-muted">
          {colleges.length} {colleges.length === 1 ? "college" : "colleges"}
        </span>
      </div>
      <div className="divide-y divide-hairline">
        {colleges.map((c) => (
          <CollegeCard key={c.id} college={c} onDelete={() => onDelete(c.id)} />
        ))}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  college_name: "",
  country: "",
  tier: "target",
};

function SavedListPanel({
  colleges,
}: {
  colleges: CollegeRow[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    if (!form.college_name.trim()) {
      setError("College name is required.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await addCollege({
        college_name: form.college_name,
        country: form.country,
        program: "",
        tier: form.tier,
        application_deadline: "",
        portal_name: "",
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCollege(id);
    });
  }

  const byTier = (tier: string) => colleges.filter((c) => c.tier === tier);
  const noTier = colleges.filter((c) => !c.tier || !TIER_CONFIG[c.tier]);
  const tiers = (["reach", "target", "safety", "exam-cutoff"] as const).filter(
    (t) => byTier(t).length > 0,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="type-body-sm font-medium text-ink">Saved list</p>
          {colleges.length > 0 && (
            <p className="type-body-sm text-muted mt-0.5">
              {colleges.length} {colleges.length === 1 ? "school" : "schools"}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className={cn(
            "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-3 text-[0.75rem] font-medium transition-all",
            showForm
              ? "border-hairline bg-surface-soft text-muted hover:text-error hover:border-error/20 hover:bg-error/5"
              : "border-hairline bg-canvas text-muted hover:text-ink hover:border-primary/25 hover:bg-primary/3",
          )}
        >
          {showForm ? (
            <>
              <X className="h-3.5 w-3.5" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Add
            </>
          )}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-hairline bg-canvas p-5 flex flex-col gap-4 shadow-sm">
          <p className="type-body-sm font-medium text-ink">Add a college</p>
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-[0.68rem] font-medium uppercase tracking-wider text-muted mb-1.5">
                College Name <span className="text-error">*</span>
              </label>
              <CollegeCombobox
                value={form.college_name}
                onChange={(name) => setForm((f) => ({ ...f, college_name: name }))}
                onSelectSuggestion={(s) =>
                  setForm((f) => ({ ...f, college_name: s.name, country: s.country }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.68rem] font-medium uppercase tracking-wider text-muted mb-1.5">
                  Country
                </label>
                <SimpleSelect
                  value={form.country}
                  onChange={(v) => setForm((f) => ({ ...f, country: v }))}
                  options={COUNTRY_SELECT_OPTIONS}
                  placeholder="— select —"
                />
              </div>
              <div>
                <label className="block text-[0.68rem] font-medium uppercase tracking-wider text-muted mb-1.5">
                  Tier
                </label>
                <SimpleSelect
                  value={form.tier}
                  onChange={(v) => setForm((f) => ({ ...f, tier: v }))}
                  options={TIER_SELECT_OPTIONS}
                  placeholder="Select"
                />
              </div>
            </div>
          </div>
          {error && <p className="type-body-sm text-error">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={isPending}
              className="h-9 px-5 rounded-lg bg-primary text-[0.78rem] font-medium text-on-primary hover:bg-primary-active disabled:opacity-50 transition-colors"
            >
              {isPending ? "Adding…" : "Add to list"}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); setError(null); }}
              className="h-9 px-4 rounded-lg border border-hairline text-[0.78rem] font-medium text-muted hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {colleges.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-hairline px-6 py-10 text-center">
          <p className="type-body-sm text-muted">Schools you add will appear here.</p>
          <p className="type-body-sm text-muted-soft mt-1">Use the AI guide or add manually.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tiers.map((tier) => (
            <TierSection
              key={tier}
              tier={tier}
              colleges={byTier(tier)}
              onDelete={handleDelete}
            />
          ))}
          {noTier.length > 0 && (
            <div className="rounded-xl border border-hairline bg-surface-card overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3 border-b border-hairline">
                <span className="type-body-sm text-muted">Uncategorised</span>
              </div>
              <div className="divide-y divide-hairline">
                {noTier.map((c) => (
                  <CollegeCard key={c.id} college={c} onDelete={() => handleDelete(c.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CollegeListClient({
  colleges,
  userName,
  listContext,
  profileForDiscovery,
  initialMessages,
}: {
  colleges: CollegeRow[];
  userName: string;
  listContext: CollegeListContext;
  profileForDiscovery: ProfileForDiscovery;
  initialMessages: StoredCollegeListMessage[];
}) {
  const autoStart = shouldAutoStartDiscovery(listContext, colleges.length);
  const existingNames = colleges.map((c) => c.college_name);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 xl:gap-8 animate-premium-reveal">
      <div className="xl:col-span-3 animate-premium-reveal stagger-1">
        <CollegeListGuide
          userName={userName}
          listContext={listContext}
          profileForDiscovery={profileForDiscovery}
          initialMessages={initialMessages}
          autoStart={autoStart}
          existingCollegeNames={existingNames}
        />
      </div>

      {/* Saved list — sidebar on desktop */}
      <div className="xl:col-span-2 animate-premium-reveal stagger-2">
        <div className="xl:sticky xl:top-6">
          <SavedListPanel colleges={colleges} />
        </div>
      </div>
    </div>
  );
}
