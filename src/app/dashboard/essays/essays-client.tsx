"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { addEssay, updateEssayContent, updateEssayStatus, deleteEssay } from "./actions";

export type EssayRow = {
  id: string;
  essay_type: string;
  college_name: string | null;
  prompt_label: string | null;
  prompt: string | null;
  word_limit: number | null;
  content: string | null;
  word_count: number | null;
  status: string;
};

const ESSAY_TYPE_LABELS: Record<string, string> = {
  common_app_main: "Common App Essay",
  coalition_main: "Coalition Essay",
  ucas_ps: "UCAS Personal Statement",
  supplemental: "Supplemental",
  scholarship: "Scholarship Essay",
  other: "Other",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  not_started:   { label: "Not Started",   color: "text-muted bg-surface-soft border-hairline" },
  brainstorming: { label: "Brainstorming", color: "text-warning bg-warning/8 border-warning/20" },
  drafting:      { label: "Drafting",      color: "text-primary bg-primary/8 border-primary/20" },
  revising:      { label: "Revising",      color: "text-primary bg-primary/10 border-primary/25" },
  final:         { label: "Final ✓",       color: "text-success bg-success/10 border-success/20" },
};

const STATUS_SEQUENCE = ["not_started", "brainstorming", "drafting", "revising", "final"];

const inputCls = "h-9 w-full rounded-md border border-hairline bg-canvas px-3 type-body-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40";
const selectCls = "h-9 w-full rounded-md border border-hairline bg-canvas px-3 type-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40";

function EssayCard({ essay }: { essay: EssayRow }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState(essay.content ?? "");
  const [isPending, startTransition] = useTransition();
  const [savedContent, setSavedContent] = useState(essay.content ?? "");
  const [showStatuses, setShowStatuses] = useState(false);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const limit = essay.word_limit;
  const pct = limit ? Math.min(100, Math.round((wordCount / limit) * 100)) : null;
  const overLimit = limit ? wordCount > limit : false;
  const statusCfg = STATUS_CONFIG[essay.status] ?? STATUS_CONFIG.not_started;
  const typeLabel = ESSAY_TYPE_LABELS[essay.essay_type] ?? essay.essay_type;

  function handleSaveContent() {
    startTransition(async () => {
      await updateEssayContent(essay.id, content);
      setSavedContent(content);
    });
  }

  function handleStatusChange(s: string) {
    setShowStatuses(false);
    startTransition(async () => { await updateEssayStatus(essay.id, s); });
  }

  function handleDelete() {
    startTransition(async () => { await deleteEssay(essay.id); });
  }

  const isDirty = content !== savedContent;

  return (
    <div className="border-b border-hairline last:border-0">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-3.5 group">
        <div className="flex-1 min-w-0">
          <p className="type-caption text-ink">
            {essay.college_name ? `${essay.college_name} — ` : ""}{essay.prompt_label || typeLabel}
          </p>
          {essay.prompt && (
            <p className="type-body-sm text-muted mt-0.5 line-clamp-1">{essay.prompt}</p>
          )}
          {!expanded && (
            <div className="flex items-center gap-3 mt-1">
              {pct !== null && (
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1 rounded-pill bg-surface-cream-strong overflow-hidden">
                    <div
                      className={cn("h-full rounded-pill transition-all", overLimit ? "bg-error" : "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={cn("type-body-sm tabular-nums", overLimit ? "text-error" : "text-muted")} style={{ fontSize: "0.7rem" }}>
                    {wordCount}/{limit}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="relative">
          <button
            onClick={() => setShowStatuses(s => !s)}
            className={cn("inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 type-caption border hover:opacity-80 transition-opacity", statusCfg.color)}
            style={{ fontSize: "0.68rem" }}
          >
            {statusCfg.label}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showStatuses && (
            <div className="absolute right-0 top-full mt-1 z-10 rounded-lg border border-hairline bg-canvas shadow-lg min-w-[140px] py-1">
              {STATUS_SEQUENCE.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    "w-full text-left px-3 py-2 type-body-sm hover:bg-surface-soft transition-colors",
                    essay.status === s ? "text-primary font-medium" : "text-body"
                  )}
                >
                  {STATUS_CONFIG[s]?.label ?? s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Expand + delete */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(e => !e)}
            className="h-7 w-7 flex items-center justify-center text-muted hover:text-ink transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="h-7 w-7 flex items-center justify-center text-muted hover:text-error transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-5 pb-5 flex flex-col gap-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Start writing here…"
            rows={10}
            className={cn(inputCls, "h-auto py-3 resize-y font-mono text-xs leading-relaxed")}
          />
          <div className="flex items-center justify-between">
            <span className={cn("type-body-sm tabular-nums", overLimit ? "text-error" : "text-muted")}>
              {wordCount} words{limit ? ` / ${limit} limit` : ""}
            </span>
            <button
              onClick={handleSaveContent}
              disabled={!isDirty || isPending}
              className="h-8 px-4 rounded-md bg-primary type-caption text-on-primary hover:bg-primary-active disabled:opacity-40 transition-colors"
            >
              {isPending ? "Saving…" : isDirty ? "Save draft" : "Saved"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  essay_type: "common_app_main",
  college_name: "",
  prompt_label: "",
  prompt: "",
  word_limit: "" as unknown as number | null,
};

const ESSAY_TYPES = Object.entries(ESSAY_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export function EssaysClient({
  essays,
  colleges,
  hasUK,
}: {
  essays: EssayRow[];
  colleges: string[];
  hasUK: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    startTransition(async () => {
      setError(null);
      const result = await addEssay({
        ...form,
        word_limit: form.word_limit ? Number(form.word_limit) : null,
      });
      if (result.error) { setError(result.error); return; }
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
    });
  }

  const grouped: Record<string, EssayRow[]> = {};
  for (const e of essays) {
    const key = e.essay_type;
    grouped[key] = [...(grouped[key] ?? []), e];
  }

  const groupOrder = [
    "common_app_main",
    "coalition_main",
    ...(hasUK ? ["ucas_ps"] : []),
    "supplemental",
    "scholarship",
    "other",
  ];

  const orderedGroups = [
    ...groupOrder.filter(k => grouped[k]?.length),
    ...Object.keys(grouped).filter(k => !groupOrder.includes(k)),
  ];

  return (
    <div className="flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <p className="type-body-sm text-muted">
          {essays.length === 0 ? "No essays tracked yet." : `${essays.length} ${essays.length === 1 ? "essay" : "essays"} tracked.`}
        </p>
        <button
          onClick={() => setShowForm(s => !s)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 type-caption text-on-primary hover:bg-primary-active transition-colors"
        >
          {showForm ? <><X className="h-3.5 w-3.5" />Cancel</> : <><Plus className="h-3.5 w-3.5" />Add essay</>}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 flex flex-col gap-3">
          <p className="type-caption text-ink">New essay</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Essay Type</label>
              <select className={selectCls} value={form.essay_type} onChange={e => setForm(f => ({ ...f, essay_type: e.target.value }))}>
                {ESSAY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>
                {form.essay_type === "supplemental" ? "College" : "College (optional)"}
              </label>
              {colleges.length > 0 ? (
                <select className={selectCls} value={form.college_name} onChange={e => setForm(f => ({ ...f, college_name: e.target.value }))}>
                  <option value="">None</option>
                  {colleges.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.college_name}
                  onChange={e => setForm(f => ({ ...f, college_name: e.target.value }))}
                  placeholder="e.g. Stanford"
                  className={inputCls}
                />
              )}
            </div>
            <div>
              <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Label (short)</label>
              <input
                type="text"
                value={form.prompt_label}
                onChange={e => setForm(f => ({ ...f, prompt_label: e.target.value }))}
                placeholder='e.g. "Why Us", "Diversity"'
                className={inputCls}
              />
            </div>
            <div>
              <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Word Limit</label>
              <input
                type="number"
                value={form.word_limit ?? ""}
                onChange={e => setForm(f => ({ ...f, word_limit: e.target.value as unknown as number | null }))}
                placeholder="e.g. 650"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Prompt (optional)</label>
            <input type="text" value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} placeholder="Full prompt text…" className={inputCls} />
          </div>
          {error && <p className="type-body-sm text-error">{error}</p>}
          <button
            onClick={handleAdd}
            disabled={isPending}
            className="h-9 px-5 rounded-md bg-primary type-caption text-on-primary hover:bg-primary-active disabled:opacity-50 transition-colors self-start"
          >
            {isPending ? "Adding…" : "Add essay"}
          </button>
        </div>
      )}

      {/* Essay groups */}
      {essays.length === 0 && !showForm ? (
        <div className="rounded-lg border border-hairline bg-surface-card px-6 py-12 text-center">
          <p className="type-caption text-ink mb-1">No essays tracked yet</p>
          <p className="type-body-sm text-muted mb-4">Add your Common App essay, UCAS PS, or supplementals to track status and drafts.</p>
          <button onClick={() => setShowForm(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 type-caption text-on-primary hover:bg-primary-active transition-colors">
            <Plus className="h-3.5 w-3.5" />Add first essay
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orderedGroups.map(typeKey => {
            const group = grouped[typeKey] ?? [];
            return (
              <div key={typeKey} className="rounded-lg border border-hairline bg-surface-card overflow-hidden">
                <div className="px-5 py-3 border-b border-hairline">
                  <p className="type-caption text-ink">{ESSAY_TYPE_LABELS[typeKey] ?? typeKey}</p>
                </div>
                <div>
                  {group.map(e => <EssayCard key={e.id} essay={e} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
