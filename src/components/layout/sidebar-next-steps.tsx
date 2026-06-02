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

  return (
    <div className="px-3 pb-4">
      <div className="rounded-lg border border-hairline bg-surface-card p-3 shadow-[0_1px_2px_rgba(24,23,21,0.04)]">
        <div className="flex items-baseline justify-between gap-3">
          <p className="type-caption-upper text-muted">Next steps</p>
          <span className="shrink-0 text-xs font-medium text-ink tabular-nums">
            {doneCount}/{totalCount}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-surface-cream-strong">
          <div
            className="h-full rounded-pill bg-primary transition-all duration-500 ease-out"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
        <ul className="mt-2.5 flex flex-col gap-2">
          {visibleSteps.length > 0 ? (
            visibleSteps.map(({ id, title, href }) => {
              const Icon = STEP_ICONS[id];
              return (
                <li key={id}>
                  <Link
                    href={href}
                    title={title}
                    className="group grid w-full grid-cols-[2rem_minmax(0,1fr)_1rem] items-center gap-x-2.5 rounded-lg border border-hairline/70 bg-surface-soft/50 px-2.5 py-2.5 text-ink transition-[border-color,background-color,box-shadow] hover:border-primary/25 hover:bg-surface-soft hover:shadow-[0_1px_3px_rgba(204,120,92,0.08)]"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface-card shadow-[0_1px_0_rgba(24,23,21,0.04)]">
                      <Icon
                        className="h-4 w-4 text-primary"
                        strokeWidth={1.6}
                      />
                    </div>
                    <span className="line-clamp-2 min-w-0 text-[13px] font-medium leading-snug text-body group-hover:text-primary">
                      {title}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 justify-self-end text-muted/80 transition-colors group-hover:translate-x-0.5 group-hover:text-primary"
                      strokeWidth={1.5}
                    />
                  </Link>
                </li>
              );
            })
          ) : (
            <li>
              <div className="flex items-center gap-3 rounded-lg border border-hairline/70 bg-surface-soft/50 px-2.5 py-2.5">
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-success"
                  strokeWidth={2}
                />
                <span className="text-xs leading-relaxed text-muted">
                  All steps completed.
                </span>
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
