"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Check, X, ChevronDown, ChevronUp, Plus, ChevronLeft, ChevronRight,
  CalendarDays, LayoutList, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanCategory, PlanItem } from "./plan-data";
import {
  addItem, updateItem, updateItemStatus, updateItemDates, deleteItem,
  addCategory,
} from "./actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_HEX: Record<string, string> = {
  blue:   "#2D7FC1",
  teal:   "#5db8a6",
  amber:  "#e8a55a",
  green:  "#5db872",
  red:    "#c64545",
  purple: "#7c5cbf",
  grey:   "#8e8b82",
};

const COLOR_OPTIONS = [
  { key: "blue",   label: "Blue"   },
  { key: "teal",   label: "Teal"   },
  { key: "green",  label: "Green"  },
  { key: "amber",  label: "Amber"  },
  { key: "red",    label: "Red"    },
  { key: "purple", label: "Purple" },
  { key: "grey",   label: "Grey"   },
];

const PRIORITY_PILL: Record<string, string> = {
  critical: "bg-error/10 text-error border-error/20",
  high:     "bg-accent-amber/20 text-ink border-accent-amber/30",
  medium:   "bg-warning/15 text-warning border-warning/25",
  low:      "bg-success/10 text-success border-success/20",
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-error",
  high:     "bg-accent-amber",
  medium:   "bg-warning",
  low:      "bg-success",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low",
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done:        "Done",
  cancelled:   "Cancelled",
  blocked:     "Blocked",
};

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

const STATUS_ORDER: Record<string, number> = {
  in_progress: 0, not_started: 1, blocked: 2, cancelled: 3, done: 4,
};

const TYPE_LABELS: Record<string, string> = {
  task: "Task", goal: "Goal", milestone: "Milestone", event: "Event",
};

const TODAY = new Date().toISOString().slice(0, 10);

function cycleStatus(s: string): string {
  if (s === "not_started") return "in_progress";
  if (s === "in_progress") return "done";
  return "not_started";
}

function fmtDate(s: string): string {
  const d = new Date(s + "T12:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtCompletedDate(s: string): string {
  const d = new Date(s);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((new Date(d.toDateString()).getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(due: string | null): boolean {
  return !!due && due < TODAY;
}

// ─── Default filters ──────────────────────────────────────────────────────────

interface Filters {
  search: string;
  status: string[];
  priority: string[];
  type: string[];
  category: string[];
  dateRange: string;
  showCompleted: boolean;
  groupBy: string;
}

const DEFAULT_FILTERS: Filters = {
  search: "", status: [], priority: [], type: [], category: [],
  dateRange: "all", showCompleted: true, groupBy: "none",
};

// ─── Custom date picker ───────────────────────────────────────────────────────

function DatePicker({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    if (value) { const d = new Date(value + "T12:00:00"); return { y: d.getFullYear(), m: d.getMonth() }; }
    const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() };
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function openPicker() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(true);
  }

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y: number, m: number) => new Date(y, m, 1).getDay();
  const totalDays = daysInMonth(view.y, view.m);
  const startOffset = firstDay(view.y, view.m);
  const cells = Array.from({ length: startOffset + totalDays }, (_, i) =>
    i < startOffset ? null : i - startOffset + 1
  );

  const todayD = new Date();
  const selectedD = value ? new Date(value + "T12:00:00") : null;
  const isToday = (d: number) =>
    d === todayD.getDate() && view.m === todayD.getMonth() && view.y === todayD.getFullYear();
  const isSelected = (d: number) =>
    !!selectedD && d === selectedD.getDate() && view.m === selectedD.getMonth() && view.y === selectedD.getFullYear();

  function pick(d: number) {
    onChange(`${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    setOpen(false);
  }

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <>
      <button
        ref={triggerRef} type="button" onClick={openPicker}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all w-full",
          "border-hairline hover:border-primary/40 focus:outline-none focus:border-primary/60",
          value ? "text-ink" : "text-muted"
        )}
      >
        <CalendarDays size={14} className="text-muted flex-shrink-0" />
        <span className="flex-1 text-left">{value ? fmtDate(value) : placeholder}</span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); onChange(""); }}
            className="text-muted hover:text-error cursor-pointer"
          >
            <X size={12} />
          </span>
        )}
      </button>

      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[499]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[500] bg-canvas border border-hairline rounded-xl shadow-xl p-3 w-64"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setView(v => { const m = v.m === 0 ? 11 : v.m - 1; return { y: m === 11 ? v.y - 1 : v.y, m }; })}
                className="w-7 h-7 rounded-lg hover:bg-surface-card flex items-center justify-center text-muted hover:text-ink transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm font-medium text-ink">{monthNames[view.m]} {view.y}</span>
              <button onClick={() => setView(v => { const m = (v.m + 1) % 12; return { y: m === 0 ? v.y + 1 : v.y, m }; })}
                className="w-7 h-7 rounded-lg hover:bg-surface-card flex items-center justify-center text-muted hover:text-ink transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                <div key={d} className="text-center text-xs text-muted py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => d === null ? <div key={i} /> : (
                <button
                  key={i} onClick={() => pick(d)}
                  className={cn(
                    "w-full aspect-square rounded-lg text-xs font-medium transition-all",
                    isSelected(d) ? "bg-primary text-on-primary" :
                    isToday(d)    ? "bg-primary/10 text-primary font-semibold" :
                                    "hover:bg-surface-card text-ink"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// ─── Category selector ────────────────────────────────────────────────────────

function CategorySelector({
  categories, value, onChange, onAddCategory,
}: {
  categories: PlanCategory[];
  value: string;
  onChange: (v: string) => void;
  onAddCategory: (name: string, color: string) => Promise<string | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const selected = categories.find(c => c.id === value);

  function openDrop() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    setOpen(true);
  }

  async function handleAddNew() {
    if (!newName.trim()) return;
    const id = await onAddCategory(newName.trim(), newColor);
    if (id) onChange(id);
    setNewName(""); setNewColor("blue"); setAddingNew(false); setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef} type="button" onClick={openDrop}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-hairline hover:border-primary/40 text-sm w-full transition-all"
      >
        {selected
          ? <><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLOR_HEX[selected.color] }} /><span className="text-ink flex-1 text-left">{selected.name}</span></>
          : <span className="text-muted flex-1 text-left">None</span>}
        <ChevronDown size={12} className="text-muted" />
      </button>

      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[499]" onClick={() => { setOpen(false); setAddingNew(false); }} />
          <div
            className="fixed z-[500] bg-canvas border border-hairline rounded-xl shadow-xl py-1 overflow-hidden"
            style={{ top: pos.top, left: pos.left, width: Math.max(pos.width, 200) }}
          >
            <button
              onClick={() => { onChange(""); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-muted hover:bg-surface-card transition-colors"
            >
              None
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => { onChange(c.id); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors",
                  value === c.id ? "bg-primary/8 text-primary" : "text-ink hover:bg-surface-card"
                )}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLOR_HEX[c.color] }} />
                {c.name}
              </button>
            ))}
            <div className="border-t border-hairline mt-1 pt-1">
              {!addingNew ? (
                <button
                  onClick={() => setAddingNew(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted hover:text-primary hover:bg-surface-card transition-colors"
                >
                  <Plus size={13} /> Add category
                </button>
              ) : (
                <div className="px-3 py-2 space-y-2">
                  <input
                    autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Category name"
                    onKeyDown={e => { if (e.key === "Enter") handleAddNew(); if (e.key === "Escape") setAddingNew(false); }}
                    className="w-full bg-transparent text-sm text-ink border-b border-primary/40 focus:outline-none pb-0.5"
                  />
                  <div className="flex items-center gap-1.5">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c.key} type="button" onClick={() => setNewColor(c.key)}
                        style={{ background: COLOR_HEX[c.key] }}
                        className={cn("w-4 h-4 rounded-full transition-all", newColor === c.key && "ring-2 ring-offset-1 ring-ink/30 scale-110")} />
                    ))}
                    <button onClick={handleAddNew} className="ml-auto text-primary hover:opacity-70">
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// ─── Item modal ───────────────────────────────────────────────────────────────

function ItemModal({
  item, categories, onClose, onSave, onDelete, onAddCategory,
}: {
  item: Partial<PlanItem>;
  categories: PlanCategory[];
  onClose: () => void;
  onSave: (data: Partial<PlanItem>) => Promise<void>;
  onDelete?: () => void;
  onAddCategory: (name: string, color: string) => Promise<string | undefined>;
}) {
  const [title, setTitle] = useState(item.title ?? "");
  const [type, setType] = useState<PlanItem["type"]>(item.type ?? "task");
  const [priority, setPriority] = useState<PlanItem["priority"]>(item.priority ?? "medium");
  const [status, setStatus] = useState<PlanItem["status"]>(item.status ?? "not_started");
  const [categoryId, setCategoryId] = useState(item.category_id ?? "");
  const [dueDate, setDueDate] = useState(item.due_date ?? "");
  const [startDate, setStartDate] = useState(item.start_date ?? "");
  const [description] = useState(item.description ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [showMore, setShowMore] = useState(!!(item.description || item.notes || item.status !== "not_started"));
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);

  const isEdit = !!item.id;

  const PRIORITY_ACTIVE: Record<string, string> = {
    critical: "bg-error/10 text-error border-error/30",
    high:     "bg-accent-amber/20 text-ink border-accent-amber/40",
    medium:   "bg-warning/15 text-warning border-warning/25",
    low:      "bg-success/10 text-success border-success/20",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setTitleError(true); return; }
    setSaving(true);
    await onSave({
      title: title.trim(), type, priority, status,
      category_id: categoryId || null,
      due_date: dueDate || null, start_date: startDate || null,
      description: description || null, notes: notes || null,
    });
    setSaving(false);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(20,20,19,0.5)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="bg-canvas rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: "88vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-hairline">
          <h2 className="font-sans font-semibold text-base text-ink">
            {isEdit ? "Edit item" : "New item"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface-card transition-all">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto">
          <div className="px-6 py-6 space-y-5">
            {/* Title */}
            <input
              autoFocus value={title}
              onChange={e => { setTitle(e.target.value); setTitleError(false); }}
              placeholder="What are you planning?"
              className={cn(
                "w-full bg-transparent border-b pb-2.5 text-[17px] font-medium text-ink placeholder:text-muted",
                "focus:outline-none transition-colors",
                titleError ? "border-error" : "border-hairline focus:border-primary/50"
              )}
            />

            {/* Category + Due date — always visible */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="type-caption-upper text-muted mb-1.5">Category</p>
                <CategorySelector
                  categories={categories}
                  value={categoryId}
                  onChange={setCategoryId}
                  onAddCategory={onAddCategory}
                />
              </div>
              <div>
                <p className="type-caption-upper text-muted mb-1.5">Due date</p>
                <DatePicker value={dueDate} onChange={setDueDate} placeholder="Pick a date" />
              </div>
            </div>

            {/* More options toggle */}
            <button
              type="button"
              onClick={() => setShowMore(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
            >
              {showMore ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {showMore ? "Fewer options" : "More options"}
            </button>

            {showMore && (
              <div className="space-y-5 pt-1">
                {/* Type pills */}
                <div>
                  <p className="type-caption-upper text-muted mb-2">Type</p>
                  <div className="flex gap-2 flex-wrap">
                    {(["task","goal","milestone","event"] as const).map(t => (
                      <button key={t} type="button" onClick={() => setType(t)}
                        className={cn(
                          "px-3 py-1.5 rounded-pill text-sm font-medium border capitalize transition-all",
                          type === t
                            ? "bg-primary text-on-primary border-primary"
                            : "border-hairline text-muted hover:border-primary/40 hover:text-ink"
                        )}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <p className="type-caption-upper text-muted mb-2">Priority</p>
                  <div className="flex gap-2 flex-wrap">
                    {(["critical","high","medium","low"] as const).map(p => (
                      <button key={p} type="button" onClick={() => setPriority(p)}
                        className={cn(
                          "px-3 py-1.5 rounded-pill text-sm font-medium border capitalize transition-all",
                          priority === p ? PRIORITY_ACTIVE[p] : "border-hairline text-muted hover:border-primary/30"
                        )}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start date + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="type-caption-upper text-muted mb-1.5">Start date</p>
                    <DatePicker value={startDate} onChange={setStartDate} placeholder="Pick a date" />
                  </div>
                  <div>
                    <p className="type-caption-upper text-muted mb-1.5">Status</p>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as PlanItem["status"])}
                      className="w-full border border-hairline rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p className="type-caption-upper text-muted mb-1.5">Notes</p>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Any extra context or notes…" rows={3}
                    className="w-full border border-hairline rounded-lg px-3 py-2.5 text-sm text-ink bg-canvas placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-hairline flex items-center justify-between">
            {isEdit && onDelete
              ? <button type="button" onClick={onDelete}
                  className="text-xs text-muted hover:text-error transition-colors flex items-center gap-1">
                  <X size={13} /> Delete
                </button>
              : <div />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-muted border border-hairline hover:text-ink transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? "Saving…" : isEdit ? "Save" : "Add item"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Filter modal ─────────────────────────────────────────────────────────────

function FilterModal({
  filters, setFilters, categories, onClose,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  categories: PlanCategory[];
  onClose: () => void;
}) {
  const [local, setLocal] = useState<Filters>(filters);

  function toggle<K extends "status" | "priority" | "type" | "category">(
    key: K, val: string
  ) {
    setLocal(f => ({
      ...f,
      [key]: f[key].includes(val)
        ? (f[key] as string[]).filter(v => v !== val)
        : [...(f[key] as string[]), val],
    }));
  }

  const SORT_OPTIONS = [
    { v: "priority", l: "Priority" },
    { v: "due_date", l: "Due date" },
    { v: "title", l: "Title" },
    { v: "created_at", l: "Date added" },
    { v: "status", l: "Status" },
  ];

  const GROUP_OPTIONS = [
    { v: "none", l: "None" },
    { v: "category", l: "Category" },
    { v: "priority", l: "Priority" },
    { v: "status", l: "Status" },
    { v: "type", l: "Type" },
  ];

  const pillBase = "px-3.5 py-1.5 rounded-pill text-sm font-medium border transition-all";
  const pillActive = "bg-primary text-on-primary border-primary";
  const pillInactive = "border-hairline text-muted hover:border-primary/40 hover:text-ink";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(20,20,19,0.5)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="bg-canvas rounded-2xl shadow-2xl w-full max-w-xl flex flex-col"
        style={{ maxHeight: "88vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-hairline">
          <h2 className="font-sans font-semibold text-base text-ink">Filters &amp; Sort</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface-card transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-7 py-6 space-y-6">
          {/* Sort by */}
          <div>
            <p className="type-caption-upper text-muted mb-3">Sort by</p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(o => (
                <button key={o.v}
                  onClick={() => setLocal(f => ({
                    ...f,
                    sortBy: o.v,
                    sortDir: (f as Filters & { sortBy?: string; sortDir?: string }).sortBy === o.v
                      ? ((f as Filters & { sortDir?: string }).sortDir === "asc" ? "desc" : "asc")
                      : "asc",
                  } as Filters))}
                  className={cn(pillBase, (local as Filters & { sortBy?: string }).sortBy === o.v ? pillActive : pillInactive)}>
                  {o.l}
                  {(local as Filters & { sortBy?: string; sortDir?: string }).sortBy === o.v
                    ? ((local as Filters & { sortDir?: string }).sortDir === "asc" ? " ↑" : " ↓") : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Group by */}
          <div>
            <p className="type-caption-upper text-muted mb-3">Group by</p>
            <div className="flex flex-wrap gap-2">
              {GROUP_OPTIONS.map(o => (
                <button key={o.v}
                  onClick={() => setLocal(f => ({ ...f, groupBy: o.v }))}
                  className={cn(pillBase, local.groupBy === o.v ? pillActive : pillInactive)}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="type-caption-upper text-muted mb-3">Status</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_LABELS).filter(([v]) => v !== "done").map(([v, l]) => (
                <button key={v} onClick={() => toggle("status", v)}
                  className={cn(pillBase, local.status.includes(v) ? pillActive : pillInactive)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <p className="type-caption-upper text-muted mb-3">Priority</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                <button key={v} onClick={() => toggle("priority", v)}
                  className={cn(pillBase, local.priority.includes(v) ? pillActive : pillInactive)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <p className="type-caption-upper text-muted mb-3">Category</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button key={c.id} onClick={() => toggle("category", c.id)}
                    className={cn(pillBase, "flex items-center gap-2", local.category.includes(c.id) ? pillActive : pillInactive)}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: local.category.includes(c.id) ? "white" : COLOR_HEX[c.color] }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date range */}
          <div>
            <p className="type-caption-upper text-muted mb-3">Date range</p>
            <div className="flex flex-wrap gap-2">
              {[
                { v: "all", l: "All" }, { v: "today", l: "Today" },
                { v: "week", l: "This week" }, { v: "month", l: "This month" },
                { v: "overdue", l: "Overdue" },
              ].map(o => (
                <button key={o.v}
                  onClick={() => setLocal(f => ({ ...f, dateRange: o.v }))}
                  className={cn(pillBase, local.dateRange === o.v ? pillActive : pillInactive)}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* Show completed */}
          <div className="flex items-center justify-between py-1 border-t border-hairline pt-5">
            <span className="text-sm font-medium text-ink">Show completed items</span>
            <button
              onClick={() => setLocal(f => ({ ...f, showCompleted: !f.showCompleted }))}
              className={cn("relative rounded-full transition-colors flex-shrink-0", local.showCompleted ? "bg-primary" : "bg-surface-card border border-hairline")}
              style={{ width: 44, height: 24 }}
            >
              <div className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", local.showCompleted ? "translate-x-[22px]" : "translate-x-0.5")} />
            </button>
          </div>
        </div>

        <div className="px-7 py-5 border-t border-hairline flex items-center justify-between">
          <button
            onClick={() => setLocal({ ...DEFAULT_FILTERS, showCompleted: true } as Filters & { sortBy: string; sortDir: string })}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            Clear all
          </button>
          <button
            onClick={() => { setFilters(local); onClose(); }}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Status circle ────────────────────────────────────────────────────────────

function StatusCircle({ status, onClick }: { status: string; onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
        status === "done"
          ? "bg-success border-success text-white"
          : status === "in_progress"
          ? "bg-primary/15 border-primary"
          : status === "cancelled"
          ? "bg-error/15 border-error/40"
          : status === "blocked"
          ? "bg-accent-amber/20 border-accent-amber/50"
          : "border-hairline hover:border-primary/40"
      )}
    >
      {status === "done" && <Check size={12} strokeWidth={3} />}
      {status === "in_progress" && <div className="w-2 h-2 rounded-full bg-primary" />}
      {status === "cancelled" && <X size={10} className="text-error/60" />}
    </button>
  );
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item, category, showCategory, onCycleStatus, onEdit, onDelete,
}: {
  item: PlanItem;
  category: PlanCategory | undefined;
  showCategory: boolean;
  onCycleStatus: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const done = item.status === "done";
  const overdue = isOverdue(item.due_date) && !done;

  return (
    <div
      onClick={onEdit}
      className={cn(
        "flex items-center gap-4 px-6 py-4 cursor-pointer group transition-colors",
        "hover:bg-surface-soft/60",
        done && "opacity-55"
      )}
    >
      <StatusCircle status={item.status} onClick={onCycleStatus} />

      <span className={cn(
        "flex-1 text-[15px] text-ink truncate min-w-0 font-medium",
        done && "line-through text-muted font-normal"
      )}>
        {item.title}
      </span>

      {/* Right side info */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Due date */}
        {item.due_date && (
          <span className={cn(
            "text-sm",
            overdue ? "text-error font-medium" : "text-muted"
          )}>
            {fmtDate(item.due_date)}
          </span>
        )}

        {/* Category */}
        {showCategory && category && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill border border-hairline bg-canvas">
            <div className="w-2 h-2 rounded-full" style={{ background: COLOR_HEX[category.color] }} />
            <span className="text-xs text-muted">{category.name}</span>
          </div>
        )}

        {/* Priority dot + pill */}
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-pill border text-xs font-medium",
          PRIORITY_PILL[item.priority]
        )}>
          <div className={cn("w-2 h-2 rounded-full", PRIORITY_DOT[item.priority])} />
          {PRIORITY_LABELS[item.priority]}
        </div>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-error hover:bg-error/8 transition-all"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Completed section ────────────────────────────────────────────────────────

function CompletedSection({
  items, categories, onEdit, onDelete, onCycleStatus,
}: {
  items: PlanItem[];
  categories: PlanCategory[];
  onEdit: (item: PlanItem) => void;
  onDelete: (id: string) => void;
  onCycleStatus: (item: PlanItem) => void;
}) {
  const [open, setOpen] = useState(true);
  if (!items.length) return null;

  const catMap = new Map(categories.map(c => [c.id, c]));

  return (
    <div className="mt-1 border-t border-hairline">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 w-full px-6 py-4 text-left"
      >
        {open ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
        <span className="type-caption-upper text-muted">Completed</span>
        <span className="text-xs text-muted/50 bg-surface-card px-2 py-0.5 rounded-pill">{items.length}</span>
      </button>

      {open && (
        <div className="opacity-75">
          {items.map(item => {
            const cat = item.category_id ? catMap.get(item.category_id) : undefined;
            return (
              <div
                key={item.id}
                onClick={() => onEdit(item)}
                className="flex items-center gap-4 px-6 py-3.5 cursor-pointer group hover:bg-surface-soft/40 transition-colors"
              >
                <StatusCircle status={item.status} onClick={() => onCycleStatus(item)} />
                <span className="flex-1 text-[15px] text-muted line-through truncate min-w-0">
                  {item.title}
                </span>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className="text-sm text-muted/60">{fmtCompletedDate(item.updated_at)}</span>
                  {cat && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLOR_HEX[cat.color] }} />
                      <span className="text-xs text-muted/60">{cat.name}</span>
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-muted hover:text-error transition-all"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Timeline (Gantt) view ────────────────────────────────────────────────────

const MO_W = 160;
const T_ITEM_H = 30;
const T_ITEM_GAP = 5;
const T_LANE_PAD = 10;
const T_SIDEBAR = 208;
const T_HDR_Y = 24;
const T_HDR_M = 30;
const NOW = new Date();
const T_TODAY = NOW.toISOString().slice(0, 10);
const CUR_YEAR = NOW.getFullYear();
const T0 = CUR_YEAR - 1;
const T1 = CUR_YEAR + 4;
const N_MONTHS = (T1 - T0) * 12;
const MO_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function tdim(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function d2x(s: string, mw = MO_W): number {
  const d = new Date(s + "T12:00:00");
  const mo = (d.getFullYear() - T0) * 12 + d.getMonth();
  return (mo + (d.getDate() - 1) / tdim(d.getFullYear(), d.getMonth())) * mw;
}
function x2d(x: number, mw = MO_W): string {
  const raw = Math.max(0, Math.min(x / mw, N_MONTHS - 0.001));
  const mf = Math.floor(raw);
  const yr = T0 + Math.floor(mf / 12);
  const mo = mf % 12;
  const day = Math.min(tdim(yr, mo), Math.max(1, Math.round((raw - mf) * tdim(yr, mo)) + 1));
  return `${yr}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function tAddDays(s: string, n: number): string {
  const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function tDiffDays(a: string, b: string): number {
  return Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);
}

interface TLaid { item: PlanItem; row: number; x: number; w: number; point: boolean; }
function tLayoutLane(items: PlanItem[], mw: number): TLaid[] {
  const out: TLaid[] = items.filter(i => i.due_date || i.start_date).map(i => {
    const s = i.start_date || i.due_date!;
    const e = i.due_date || i.start_date!;
    const x = d2x(s, mw);
    const ed = new Date(e + "T12:00:00");
    const ex = d2x(e, mw) + mw / tdim(ed.getFullYear(), ed.getMonth());
    const point = s === e && !i.start_date;
    return { item: i, row: 0, x, w: Math.max(point ? 10 : 40, ex - x), point };
  }).sort((a, b) => a.x - b.x);
  const rowEnd: number[] = [];
  for (const l of out) {
    let r = rowEnd.findIndex(e => e + 6 <= l.x); if (r === -1) r = rowEnd.length;
    rowEnd[r] = l.x + l.w; l.row = r;
  }
  return out;
}
function tLaneH(laid: TLaid[]): number {
  if (!laid.length) return T_LANE_PAD * 2 + T_ITEM_H;
  return T_LANE_PAD * 2 + (Math.max(...laid.map(l => l.row)) + 1) * T_ITEM_H + Math.max(...laid.map(l => l.row)) * T_ITEM_GAP;
}

type TDrag = { type: "move"|"resize-l"|"resize-r"; itemId: string; mouseX0: number; origStart: string|null; origDue: string|null; mw: number; };

function TBar({ laid, color, dragItemId, dragDelta, dragType, onMD, onClickItem, onDelete }: {
  laid: TLaid; color: string; dragItemId: string|null; dragDelta: number;
  dragType: TDrag["type"]|null; onMD: (e: React.MouseEvent, id: string, t: TDrag["type"]) => void;
  onClickItem: (i: PlanItem) => void; onDelete: (id: string) => void;
}) {
  const { item, x, w, row, point } = laid;
  const isD = dragItemId === item.id;
  const done = item.status === "done";
  const [hov, setHov] = useState(false);
  let vx = x, vw = w;
  if (isD) {
    if (dragType === "move") vx = x + dragDelta;
    else if (dragType === "resize-r") vw = Math.max(12, w + dragDelta);
    else { const sh = Math.min(dragDelta, w - 12); vx = x + sh; vw = w - sh; }
  }
  const top = T_LANE_PAD + row * (T_ITEM_H + T_ITEM_GAP);
  if (point) return (
    <div style={{ position:"absolute", left:vx-9, top:top+T_ITEM_H/2-9, width:18, height:18, backgroundColor:color, transform:"rotate(45deg)", borderRadius:3, cursor:isD?"grabbing":"grab", opacity:done?0.4:1, zIndex:isD?30:3, boxShadow:isD?"0 6px 16px rgba(0,0,0,0.25)":"0 1px 4px rgba(0,0,0,0.15)" }}
      onMouseDown={e => onMD(e, item.id, "move")} onClick={() => onClickItem(item)} title={item.title} />
  );
  return (
    <div style={{ position:"absolute", left:vx, top, width:vw, height:T_ITEM_H, backgroundColor:color, borderRadius:7, opacity:done?0.42:1, zIndex:isD?30:3, userSelect:"none", boxShadow:isD?"0 8px 20px rgba(0,0,0,0.22)":hov?"0 3px 10px rgba(0,0,0,0.18)":"0 1px 3px rgba(0,0,0,0.12)", display:"flex", alignItems:"center", overflow:"visible" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={() => onClickItem(item)}>
      <div style={{ position:"absolute", left:0, top:0, width:8, height:"100%", cursor:"ew-resize", zIndex:5 }}
        onMouseDown={e => { e.stopPropagation(); onMD(e, item.id, "resize-l"); }} onClick={e => e.stopPropagation()} />
      <span style={{ color:"rgba(255,255,255,0.95)", fontSize:11.5, fontWeight:500, paddingLeft:10, paddingRight:24, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", flex:1, cursor:"grab", textDecoration:done?"line-through":"none" }}
        onMouseDown={e => onMD(e, item.id, "move")} onClick={e => e.stopPropagation()}>
        {item.title}
      </span>
      {hov && !isD && (
        <button style={{ position:"absolute", right:4, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.25)", border:"none", borderRadius:4, width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"white", zIndex:6 }}
          onClick={e => { e.stopPropagation(); onDelete(item.id); }}>
          <X size={10} />
        </button>
      )}
      <div style={{ position:"absolute", right:0, top:0, width:8, height:"100%", cursor:"ew-resize", zIndex:5 }}
        onMouseDown={e => { e.stopPropagation(); onMD(e, item.id, "resize-r"); }} onClick={e => e.stopPropagation()} />
    </div>
  );
}

function TimelineView({ categories, items, mw, onClickItem, onClickLane, onDeleteItem, onDragComplete }: {
  categories: PlanCategory[]; items: PlanItem[]; mw: number;
  onClickItem: (i: PlanItem) => void;
  onClickLane: (catId: string|null, date: string) => void;
  onDeleteItem: (id: string) => void;
  onDragComplete: (id: string, s: string|null, e: string|null, os: string|null, oe: string|null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<TDrag|null>(null);
  const [dragItemId, setDragItemId] = useState<string|null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [dragType, setDragType] = useState<TDrag["type"]|null>(null);
  const totalW = N_MONTHS * mw;

  useEffect(() => {
    if (!scrollRef.current) return;
    const x = d2x(T_TODAY, mw);
    scrollRef.current.scrollLeft = Math.max(0, x - scrollRef.current.clientWidth / 2);
  }, [mw]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      setDragDelta(e.clientX - dragRef.current.mouseX0);
    }
    function onUp(e: MouseEvent) {
      if (!dragRef.current) return;
      const { type, itemId, mouseX0, origStart, origDue, mw: dmw } = dragRef.current;
      const delta = e.clientX - mouseX0;
      let ns = origStart, nd = origDue;
      if (type === "move") {
        if (origStart) { ns = x2d(d2x(origStart, dmw) + delta, dmw); if (origDue) nd = tAddDays(ns, tDiffDays(origStart, origDue)); }
        else if (origDue) nd = x2d(d2x(origDue, dmw) + delta, dmw);
      } else if (type === "resize-l") {
        ns = x2d(d2x(origStart || origDue!, dmw) + delta, dmw);
        if (ns && nd && ns > nd) ns = nd;
      } else {
        nd = x2d(d2x(origDue || origStart!, dmw) + delta, dmw);
        if (ns && nd && nd < ns) nd = ns;
      }
      dragRef.current = null; setDragItemId(null); setDragDelta(0); setDragType(null);
      onDragComplete(itemId, ns, nd, origStart, origDue);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [onDragComplete, mw]);

  function handleMD(e: React.MouseEvent, id: string, type: TDrag["type"]) {
    e.preventDefault(); e.stopPropagation();
    const item = items.find(i => i.id === id); if (!item) return;
    dragRef.current = { type, itemId: id, mouseX0: e.clientX, origStart: item.start_date, origDue: item.due_date, mw };
    setDragItemId(id); setDragType(type); setDragDelta(0);
  }

  const todayX = d2x(T_TODAY, mw);
  const laneData = useMemo(() => categories.map(cat => {
    const catItems = items.filter(i => i.category_id === cat.id);
    const laid = tLayoutLane(catItems, mw);
    return { cat, laid, height: tLaneH(laid) };
  }), [categories, items, mw]);

  const unscheduled = useMemo(() => items.filter(i => !i.due_date && !i.start_date), [items]);

  function handleLaneClick(e: React.MouseEvent<HTMLDivElement>, catId: string|null) {
    if (dragItemId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onClickLane(catId, x2d(Math.max(0, e.clientX - rect.left), mw));
  }

  return (
    <div ref={scrollRef} className="overflow-auto flex-1 h-full" style={{ cursor: dragItemId ? "grabbing" : "default" }}>
      <div style={{ width: T_SIDEBAR + totalW, minWidth: T_SIDEBAR + totalW }}>
        {/* Header */}
        <div className="sticky top-0 z-20 flex" style={{ height: T_HDR_Y + T_HDR_M }}>
          <div className="sticky left-0 z-30 bg-surface-card border-r border-b border-hairline flex items-end pb-2 px-4"
            style={{ width: T_SIDEBAR, minWidth: T_SIDEBAR }}>
            <span className="type-caption-upper text-muted text-xs">Category</span>
          </div>
          <div style={{ width: totalW, minWidth: totalW }}>
            <div className="flex" style={{ height: T_HDR_Y }}>
              {Array.from({ length: T1 - T0 }, (_, i) => (
                <div key={i} className="bg-surface-card border-r border-b border-hairline flex items-center px-3"
                  style={{ width: 12 * mw, minWidth: 12 * mw }}>
                  <span className="text-ink text-xs font-semibold tracking-wider">{T0 + i}</span>
                </div>
              ))}
            </div>
            <div className="flex" style={{ height: T_HDR_M }}>
              {Array.from({ length: N_MONTHS }, (_, i) => {
                const yr = T0 + Math.floor(i / 12), mo = i % 12;
                const cur = yr === NOW.getFullYear() && mo === NOW.getMonth();
                return (
                  <div key={i} style={{ width: mw, minWidth: mw }}
                    className={cn("flex items-center justify-center border-r border-b text-xs font-medium",
                      cur ? "bg-primary text-on-primary border-primary" : "bg-canvas text-muted border-hairline")}>
                    {mw >= 100 ? MO_NAMES[mo] : mo % 3 === 0 ? MO_NAMES[mo] : ""}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lanes */}
        {laneData.map(({ cat, laid, height }, li) => {
          const color = COLOR_HEX[cat.color] ?? COLOR_HEX.grey;
          const even = li % 2 === 0;
          return (
            <div key={cat.id} className="flex" style={{ height, minHeight: height }}>
              <div className="sticky left-0 z-10 flex items-start pt-3 px-4 gap-2 border-r border-b border-hairline"
                style={{ width: T_SIDEBAR, minWidth: T_SIDEBAR, background: even ? "var(--color-canvas)" : "var(--color-surface-soft)" }}>
                <div className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: color, marginTop: 5 }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-ink truncate">{cat.name}</p>
                  <p className="text-xs text-muted mt-0.5">{laid.length} item{laid.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="relative border-b border-hairline flex-1"
                style={{ width: totalW, minWidth: totalW, height, background: even ? "var(--color-canvas)" : "var(--color-surface-soft)", cursor: "crosshair" }}
                onClick={e => handleLaneClick(e, cat.id)}>
                {Array.from({ length: N_MONTHS + 1 }, (_, i) => (
                  <div key={i} style={{ position:"absolute", left:i*mw, top:0, width:1, height:"100%", background: i%12===0?"rgba(24,23,21,0.1)":"rgba(24,23,21,0.04)" }} />
                ))}
                <div style={{ position:"absolute", left:todayX, top:0, width:2, height:"100%", background:"var(--color-primary)", opacity:0.45, zIndex:4, pointerEvents:"none" }} />
                {laid.map(l => <TBar key={l.item.id} laid={l} color={color} dragItemId={dragItemId} dragDelta={dragDelta} dragType={dragType} onMD={handleMD} onClickItem={i => { if (!dragItemId) onClickItem(i); }} onDelete={onDeleteItem} />)}
              </div>
            </div>
          );
        })}

        {/* Unscheduled */}
        {unscheduled.length > 0 && (
          <div className="flex border-b border-hairline" style={{ minHeight: 52 }}>
            <div className="sticky left-0 z-10 flex items-center px-4 gap-2 border-r border-hairline bg-canvas"
              style={{ width: T_SIDEBAR, minWidth: T_SIDEBAR }}>
              <div className="rounded-full" style={{ width: 8, height: 8, background: "#8e8b82" }} />
              <div>
                <p className="text-xs font-medium text-muted">Unscheduled</p>
                <p className="text-xs text-muted/60">{unscheduled.length} item{unscheduled.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 flex-wrap py-3 flex-1 bg-canvas" style={{ width: totalW }}>
              {unscheduled.map(item => (
                <button key={item.id} onClick={() => onClickItem(item)}
                  className="px-2.5 py-1 rounded-pill text-xs font-medium bg-surface-card border border-hairline text-ink hover:border-primary/40 transition-colors">
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function PlanClient({
  categories: initialCategories,
  items: initialItems,
}: {
  categories: PlanCategory[];
  items: PlanItem[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [filters, setFilters] = useState<Filters & { sortBy: string; sortDir: string }>({
    ...DEFAULT_FILTERS,
    sortBy: "priority",
    sortDir: "asc",
  });
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [mw, setMw] = useState(MO_W);
  const [search, setSearch] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [modalItem, setModalItem] = useState<Partial<PlanItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // ── Derived state ────────────────────────────────────────────────

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const filteredItems = useMemo(() => {
    const now = new Date(); now.setHours(0,0,0,0);
    return items.filter(item => {
      if (item.status === "done") return false;
      if (item.status === "cancelled") return false;
      if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filters.status.length && !filters.status.includes(item.status)) return false;
      if (filters.priority.length && !filters.priority.includes(item.priority)) return false;
      if (filters.type.length && !filters.type.includes(item.type)) return false;
      if (filters.category.length && !filters.category.includes(item.category_id ?? "")) return false;
      if (filters.dateRange !== "all" && item.due_date) {
        const d = new Date(item.due_date + "T12:00:00");
        if (filters.dateRange === "overdue" && d >= now) return false;
        if (filters.dateRange === "today" && d.toDateString() !== now.toDateString()) return false;
        if (filters.dateRange === "week") {
          const week = new Date(now); week.setDate(week.getDate() + 7);
          if (d < now || d > week) return false;
        }
        if (filters.dateRange === "month") {
          const month = new Date(now); month.setMonth(month.getMonth() + 1);
          if (d < now || d > month) return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (filters.sortBy === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (filters.sortBy === "due_date") {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1; if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      if (filters.sortBy === "status") return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (filters.sortBy === "title") return a.title.localeCompare(b.title);
      if (filters.sortBy === "created_at") return a.created_at.localeCompare(b.created_at);
      return 0;
    }).map(i => filters.sortDir === "desc" ? i : i);
  }, [items, filters, search]);

  const doneItems = useMemo(() => {
    if (!filters.showCompleted) return [];
    return items
      .filter(i => i.status === "done")
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [items, filters.showCompleted]);

  const groups = useMemo(() => {
    if (filters.groupBy === "none") return [{ key: "all", label: "", items: filteredItems, color: "" }];

    const map = new Map<string, PlanItem[]>();
    for (const item of filteredItems) {
      let key = "";
      if (filters.groupBy === "category") key = item.category_id ?? "__none__";
      else if (filters.groupBy === "priority") key = item.priority;
      else if (filters.groupBy === "status") key = item.status;
      else if (filters.groupBy === "type") key = item.type;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    return Array.from(map.entries()).map(([key, gItems]) => {
      let label = key, color = "";
      if (filters.groupBy === "category") {
        if (key === "__none__") { label = "Uncategorised"; }
        else { const c = catMap.get(key); label = c?.name ?? key; color = c ? COLOR_HEX[c.color] : "#8e8b82"; }
      } else if (filters.groupBy === "priority") { label = PRIORITY_LABELS[key] ?? key; }
      else if (filters.groupBy === "status") { label = STATUS_LABELS[key] ?? key; }
      else if (filters.groupBy === "type") { label = TYPE_LABELS[key] ?? key; }
      return { key, label, items: gItems, color };
    });
  }, [filteredItems, filters.groupBy, catMap]);

  const activeFilterCount = [
    filters.status.length, filters.priority.length, filters.type.length,
    filters.category.length, filters.dateRange !== "all" ? 1 : 0,
    !filters.showCompleted ? 1 : 0, filters.groupBy !== "none" ? 1 : 0,
    filters.sortBy !== "priority" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // ── Handlers ─────────────────────────────────────────────────────

  function handleCycleStatus(item: PlanItem) {
    const next = cycleStatus(item.status);
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, status: next as PlanItem["status"], updated_at: new Date().toISOString() }
      : i));
    updateItemStatus(item.id, next).then(r => {
      if (r.error) {
        setError(r.error);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: item.status } : i));
      }
    });
  }

  function handleDeleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
    deleteItem(id).then(r => { if (r.error) setError(r.error); });
  }

  async function handleAddCategory(name: string, color: string): Promise<string | undefined> {
    const result = await addCategory({ name, color });
    if (result.error) { setError(result.error); return undefined; }
    setCategories(prev => [...prev, {
      id: result.id!, name, color, sort_order: prev.length, created_at: new Date().toISOString(),
    }]);
    return result.id;
  }

  async function handleSaveItem(data: Partial<PlanItem>) {
    if (modalItem?.id) {
      const id = modalItem.id;
      startTransition(async () => {
        const r = await updateItem(id, {
          title: data.title!, description: data.description ?? "",
          notes: data.notes ?? "", type: data.type!,
          status: data.status!, priority: data.priority!,
          category_id: data.category_id ?? "",
          due_date: data.due_date ?? "", start_date: data.start_date ?? "",
        });
        if (r.error) setError(r.error);
        else setItems(prev => prev.map(i => i.id === id ? { ...i, ...data, updated_at: new Date().toISOString() } : i));
      });
    } else {
      const r = await addItem({
        title: data.title!, description: data.description ?? "",
        notes: data.notes ?? "", type: data.type ?? "task",
        status: data.status ?? "not_started", priority: data.priority ?? "medium",
        category_id: data.category_id ?? "",
        due_date: data.due_date ?? "", start_date: data.start_date ?? "",
      });
      if (r.error) { setError(r.error); return; }
      window.location.reload(); return;
    }
    setModalItem(null);
  }

  function handleDragComplete(id: string, ns: string|null, nd: string|null, os: string|null, od: string|null) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, start_date: ns, due_date: nd } : i));
    updateItemDates(id, { start_date: ns, due_date: nd }).then(r => {
      if (r.error) {
        setError(r.error);
        setItems(prev => prev.map(i => i.id === id ? { ...i, start_date: os, due_date: od } : i));
      }
    });
  }

  const isEmpty = filteredItems.length === 0 && doneItems.length === 0;

  return (
    <div className="space-y-5 animate-premium-reveal">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View toggle — List on left, Timeline on right */}
        <div className="flex items-center gap-1 bg-surface-card rounded-lg p-1 border border-hairline">
          <button onClick={() => setViewMode("list")}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              viewMode === "list" ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:text-ink")}>
            <LayoutList size={15} /> List
          </button>
          <button onClick={() => setViewMode("timeline")}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              viewMode === "timeline" ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:text-ink")}>
            <CalendarDays size={15} /> Timeline
          </button>
        </div>

        {/* Zoom (timeline only) */}
        {viewMode === "timeline" && (
          <div className="flex items-center gap-1 bg-surface-card rounded-lg border border-hairline overflow-hidden">
            <button onClick={() => setMw(v => Math.max(80, v - 40))} className="px-2 py-1.5 text-muted hover:text-ink hover:bg-canvas transition-colors"><ChevronLeft size={13} /></button>
            <span className="text-xs text-muted px-1 select-none" style={{ minWidth: 24, textAlign: "center" }}>
              {mw <= 80 ? "−" : mw <= 120 ? "½" : mw <= 160 ? "1×" : mw <= 200 ? "1½" : "2×"}
            </span>
            <button onClick={() => setMw(v => Math.min(240, v + 40))} className="px-2 py-1.5 text-muted hover:text-ink hover:bg-canvas transition-colors"><ChevronRight size={13} /></button>
          </div>
        )}

        {/* Search (list only) */}
        {viewMode === "list" && (
          <div className="flex-1 min-w-0 max-w-sm relative">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search items…"
              className="w-full bg-surface-card border border-hairline rounded-lg px-4 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
        )}

        <div className="flex-1" />

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-2.5 text-sm text-muted">
          <span>{filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}</span>
          {doneItems.length > 0 && <><span>·</span><span className="text-success">{doneItems.length} done</span></>}
        </div>

        {/* Filters (list only) */}
        {viewMode === "list" && (
          <button
            onClick={() => setShowFilterModal(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
              activeFilterCount > 0
                ? "bg-primary/8 border-primary/30 text-primary"
                : "border-hairline text-muted hover:border-primary/30 hover:text-ink"
            )}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-on-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {/* Add item */}
        <button
          onClick={() => setModalItem({})}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Add item
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-error/8 border border-error/20 rounded-lg text-sm text-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* ── Views ── */}
      <div key={viewMode} className="animate-premium-tab-reveal">
        {/* ── List view ── */}
        {viewMode === "list" && (
          <div className="bg-canvas border border-hairline rounded-xl overflow-hidden">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-surface-card flex items-center justify-center mb-5">
                  <CalendarDays size={28} className="text-muted" />
                </div>
                <p className="type-display-sm text-ink mb-2">Nothing here yet</p>
                <p className="type-body-sm text-muted mb-6 max-w-xs">Add tasks, goals, and milestones to map out your year ahead.</p>
                <button
                  onClick={() => setModalItem({})}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={16} /> Add your first item
                </button>
              </div>
            ) : (
              <>
                {/* Group headers + item rows */}
                {groups.map(group => (
                  <div key={group.key}>
                    {/* Group header (only when grouping) */}
                    {filters.groupBy !== "none" && (
                      <div className="flex items-center gap-3 px-6 py-3.5 border-b border-hairline bg-surface-soft/50">
                        {group.color && <div className="w-2.5 h-2.5 rounded-full" style={{ background: group.color }} />}
                        <span className="type-caption-upper text-muted">{group.label}</span>
                        <span className="text-xs text-muted/50 bg-surface-card px-2 py-0.5 rounded-pill">{group.items.length}</span>
                      </div>
                    )}
                    {/* Item rows */}
                    <div className="divide-y divide-hairline/50">
                      {group.items.map(item => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          category={item.category_id ? catMap.get(item.category_id) : undefined}
                          showCategory={filters.groupBy !== "category"}
                          onCycleStatus={() => handleCycleStatus(item)}
                          onEdit={() => setModalItem(item)}
                          onDelete={() => handleDeleteItem(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Completed section */}
                <CompletedSection
                  items={doneItems}
                  categories={categories}
                  onEdit={setModalItem}
                  onDelete={handleDeleteItem}
                  onCycleStatus={handleCycleStatus}
                />
              </>
            )}
          </div>
        )}

        {/* ── Timeline view ── */}
        {viewMode === "timeline" && (
          <>
            {/* Legend */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLOR_HEX[cat.color] ?? COLOR_HEX.grey }} />
                  {cat.name}
                </div>
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <div className="w-0.5 h-3.5 rounded-full bg-primary opacity-60" />
                Today
              </div>
            </div>
            <div className="border border-hairline rounded-xl overflow-hidden shadow-sm" style={{ height: "calc(100vh - 340px)", minHeight: 400 }}>
              <TimelineView
                categories={categories}
                items={items}
                mw={mw}
                onClickItem={item => setModalItem(item)}
                onClickLane={(catId, date) => setModalItem({ category_id: catId ?? undefined, due_date: date, start_date: date })}
                onDeleteItem={handleDeleteItem}
                onDragComplete={handleDragComplete}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {showFilterModal && (
        <FilterModal
          filters={filters as Filters}
          setFilters={f => setFilters({ ...f, sortBy: (filters as Filters & { sortBy: string; sortDir: string }).sortBy, sortDir: (filters as Filters & { sortBy: string; sortDir: string }).sortDir })}
          categories={categories}
          onClose={() => setShowFilterModal(false)}
        />
      )}

      {modalItem !== null && (
        <ItemModal
          item={modalItem}
          categories={categories}
          onClose={() => setModalItem(null)}
          onSave={handleSaveItem}
          onDelete={modalItem.id ? () => { handleDeleteItem(modalItem.id!); setModalItem(null); } : undefined}
          onAddCategory={handleAddCategory}
        />
      )}
    </div>
  );
}
