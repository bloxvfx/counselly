"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
  School,
} from "lucide-react";
import {
  buildNextSteps,
  type NextStepFlags,
  type NextStepId,
} from "@/lib/dashboard/next-steps";

type SidebarNextStepsProps = {
  flags: NextStepFlags;
};

const STEP_ICONS: Record<
  NextStepId,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  academics: GraduationCap,
  activities: Activity,
  tests: BookOpen,
  honors: Award,
  college_list: School,
  plan: Calendar,
};

export function SidebarNextSteps({ flags }: SidebarNextStepsProps) {
  const pathname = usePathname();
  if (pathname === "/dashboard") return null;

  const steps = buildNextSteps(flags);
  const totalCount = steps.length;
  const doneCount = steps.filter((step) => step.isDone).length;
  const percentComplete =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const incompleteSteps = steps.filter((step) => !step.isDone);
  const visibleSteps = incompleteSteps.slice(0, 3);
  const remainingCount = totalCount - doneCount;

  return (
    <div className="px-3 pb-3">
      <div className="rounded-lg border border-hairline bg-surface-card p-3.5">
        <div className="flex items-center justify-between">
          <p className="type-caption-upper text-muted">Next steps</p>
          <span className="text-[11px] font-semibold text-ink tabular-nums">
            {doneCount}/{totalCount}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          Finish the quick checklist to unlock everything.
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-surface-cream-strong">
          <div
            className="h-full rounded-pill bg-primary transition-all duration-500 ease-out"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
        <div className="mt-2.5 flex flex-col gap-2">
          {visibleSteps.length > 0 ? (
            visibleSteps.map(({ id, title, subtitle, href }) => {
              const Icon = STEP_ICONS[id];
              return (
              <Link
                key={id}
                href={href}
                className="group flex items-center gap-2.5 rounded-md border border-hairline/60 bg-surface-soft/40 px-2.5 py-2.5 text-xs text-ink transition-colors hover:border-primary/30 hover:text-primary"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-card">
                  <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{title}</p>
                  <p className="truncate text-[10px] text-muted">{subtitle}</p>
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-muted transition-colors group-hover:text-primary"
                  strokeWidth={1.5}
                />
              </Link>
              );
            })
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-hairline/60 bg-surface-soft/40 px-2.5 py-2.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={2} />
              <span className="text-xs text-muted">All steps completed.</span>
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {remainingCount === 0
            ? "You're all caught up."
            : `${remainingCount} step${remainingCount === 1 ? "" : "s"} left`}
        </p>
      </div>
    </div>
  );
}
