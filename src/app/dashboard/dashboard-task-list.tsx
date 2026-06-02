"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateItemStatus } from "./plan/actions";

const COLOR_HEX: Record<string, string> = {
  blue:   "#2D7FC1",
  teal:   "#5db8a6",
  amber:  "#e8a55a",
  green:  "#5db872",
  red:    "#c64545",
  purple: "#7c5cbf",
  grey:   "#8e8b82",
};

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
  critical: "Critical",
  high:     "High",
  medium:   "Medium",
  low:      "Low",
};

export type DashboardTask = {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "done" | "cancelled" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  due_date: string | null;
  type: "task" | "goal" | "milestone" | "event";
  category_id: string | null;
  created_at: string;
};

type Category = {
  id: string;
  name: string;
  color: string;
};

interface DashboardTaskListProps {
  initialTasks: DashboardTask[];
  categories: Category[];
}

const TODAY = new Date().toISOString().slice(0, 10);

function fmtDate(s: string): string {
  const d = new Date(s + "T12:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(due: string | null): boolean {
  return !!due && due < TODAY;
}

function StatusCircle({ status, onClick, disabled }: { status: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer disabled:opacity-50",
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

export function DashboardTaskList({ initialTasks, categories }: DashboardTaskListProps) {
  const [tasks, setTasks] = useState<DashboardTask[]>(initialTasks);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  async function handleToggleStatus(task: DashboardTask) {
    const newStatus = task.status === "done" ? "not_started" : "done";
    setUpdatingId(task.id);

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      const { error } = await updateItemStatus(task.id, newStatus);
      if (error) {
        // Rollback
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
        );
        console.error("Failed to update task status:", error);
      }
    } catch (e) {
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      console.error("Failed to update task status:", e);
    } finally {
      setUpdatingId(null);
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-hairline bg-surface-card p-8 text-center flex flex-col items-center justify-center gap-4 transition-all duration-300">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft border border-hairline text-muted">
          <StatusCircle status="not_started" onClick={() => {}} disabled={true} />
        </div>
        <div className="max-w-sm">
          <p className="type-caption text-ink mb-1">Your plan is empty</p>
          <p className="type-body-sm text-muted">
            Map out your high school tasks, events, and testing goals to stay organized.
          </p>
        </div>
        <Link
          href="/dashboard/plan"
          className="mt-1 inline-flex items-center justify-center font-sans font-medium rounded-md h-8 px-4 text-xs gap-1.5 bg-canvas text-ink border border-hairline hover:bg-surface-soft transition-colors"
        >
          Add your first task
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-hairline bg-surface-card overflow-hidden divide-y divide-hairline">
        {tasks.map((task) => {
          const isDone = task.status === "done";
          const category = task.category_id ? categoryMap.get(task.category_id) : null;
          const overdue = isOverdue(task.due_date) && !isDone;

          return (
            <Link
              key={task.id}
              href="/dashboard/plan"
              className={cn(
                "flex items-center gap-4 px-6 py-4 transition-all duration-300 group hover:bg-surface-soft/60",
                isDone && "opacity-55"
              )}
            >
              {/* Checkbox circle status control */}
              <StatusCircle
                status={task.status}
                onClick={() => handleToggleStatus(task)}
                disabled={updatingId === task.id}
              />

              {/* Task title text */}
              <span
                className={cn(
                  "flex-1 text-[15px] text-ink truncate min-w-0 font-medium",
                  isDone && "line-through text-muted font-normal"
                )}
              >
                {task.title}
              </span>

              {/* Metadata on the right */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                {/* Due date relative format */}
                {task.due_date && (
                  <span
                    className={cn(
                      "text-sm shrink-0",
                      overdue ? "text-error font-medium" : "text-muted"
                    )}
                  >
                    {fmtDate(task.due_date)}
                  </span>
                )}

                {/* Category name with colored dot */}
                {category && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill border border-hairline bg-canvas shrink-0">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: COLOR_HEX[category.color] || COLOR_HEX.grey }}
                    />
                    <span className="text-xs text-muted">{category.name}</span>
                  </div>
                )}

                {/* Priority pill with colored dot */}
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-pill border text-xs font-medium shrink-0",
                    PRIORITY_PILL[task.priority] || PRIORITY_PILL.low
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      PRIORITY_DOT[task.priority] || PRIORITY_DOT.low
                    )}
                  />
                  {PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.low}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* View All Plan link */}
      <div className="flex justify-end px-1 mt-1">
        <Link
          href="/dashboard/plan"
          className="group inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline animate-premium-reveal"
        >
          Manage Plan
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
            strokeWidth={1.5}
          />
        </Link>
      </div>
    </div>
  );
}
