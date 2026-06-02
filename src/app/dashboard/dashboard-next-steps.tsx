"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Activity,
  BookOpen,
  Award,
  School,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildNextSteps,
  type NextStepFlags,
  type NextStepId,
} from "@/lib/dashboard/next-steps";

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

type StepItem = ReturnType<typeof buildNextSteps>[number] & {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

export function DashboardNextSteps(flags: NextStepFlags) {
  const [showCompleted, setShowCompleted] = useState(false);

  const steps: StepItem[] = buildNextSteps(flags).map((step) => ({
    ...step,
    Icon: STEP_ICONS[step.id],
  }));

  const incompleteSteps = steps.filter((s) => !s.isDone);
  const completedSteps = steps.filter((s) => s.isDone);

  // Show at maximum 4 next steps
  const visibleIncompleteSteps = incompleteSteps.slice(0, 4);

  const totalSteps = steps.length;
  const doneCount = completedSteps.length;
  const percentComplete = Math.round((doneCount / totalSteps) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Onboarding Checklist Progress Header */}
      <div className="rounded-lg border border-hairline bg-surface-card p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Checklist Progress</h3>
            <p className="text-[11px] text-muted">
              {doneCount === totalSteps
                ? "🎉 You've completed all setup steps!"
                : `Complete these steps to unlock full counselling recommendations. (${doneCount} of ${totalSteps} done)`}
            </p>
          </div>
          <span className="text-sm font-bold text-ink tabular-nums">{percentComplete}%</span>
        </div>
        <div className="h-2 rounded-pill bg-surface-cream-strong overflow-hidden">
          <div
            className="h-full rounded-pill bg-primary transition-all duration-700 ease-out"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Active Steps List (Buttons) */}
      <div className="flex flex-col gap-2.5">
        {visibleIncompleteSteps.length > 0 ? (
          visibleIncompleteSteps.map(({ id, title, subtitle, description, href, Icon }) => (
            <Link
              key={id}
              href={href}
              className={cn(
                "group flex items-center gap-3.5 rounded-lg border border-hairline bg-surface-card px-4 py-3.5 sm:px-5 sm:py-4",
                "premium-interactive animate-premium-reveal"
              )}
            >
              {/* Uncompleted Circle Check Icon */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft border border-hairline group-hover:bg-primary/8 group-hover:border-primary/20 transition-all duration-300">
                <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="type-caption text-ink font-semibold group-hover:text-primary transition-colors">
                    {title}
                  </p>
                </div>
                <p className="text-xs text-muted font-medium mt-0.5">{subtitle}</p>
                <p className="type-body-sm text-muted/80 line-clamp-1 mt-0.5 text-xs">
                  {description}
                </p>
              </div>

              {/* Action indicator */}
              <ArrowRight
                className="h-4 w-4 text-muted shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary"
                strokeWidth={1.5}
              />
            </Link>
          ))
        ) : (
          <div className="rounded-lg border border-hairline border-dashed bg-surface-card/50 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2.5" strokeWidth={1.5} />
            <p className="type-caption text-ink mb-0.5">All next steps completed!</p>
            <p className="type-body-sm text-muted max-w-sm mx-auto">
              Your profile is fully seeded with your academics, activities, tests, and honors, and your college list & timeline are set up. Excellent work!
            </p>
          </div>
        )}
      </div>

      {/* Collapsible Completed Steps */}
      {completedSteps.length > 0 && (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1.5 px-1 py-1 text-xs font-semibold text-muted hover:text-ink transition-colors focus:outline-none cursor-pointer"
          >
            {showCompleted ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {showCompleted ? "Hide" : "Show"} completed steps ({completedSteps.length})
          </button>

          {showCompleted && (
            <div className="mt-2 flex flex-col gap-2 bg-surface-soft/20 rounded-lg p-3 border border-hairline/60 divide-y divide-hairline/40 animate-premium-tab-reveal">
              {completedSteps.map(({ id, title, subtitle, href }) => (
                <div key={id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" strokeWidth={2} />
                    <div className="min-w-0">
                      <p className="text-xs text-muted line-through font-medium truncate">
                        {title}
                      </p>
                      <p className="text-[10px] text-muted-soft">
                        {subtitle}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={href}
                    className="shrink-0 text-[10px] font-semibold text-primary hover:underline"
                  >
                    View / Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
