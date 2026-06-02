import { Suspense } from "react";
import { PlanData } from "./plan-data";
import { Skeleton } from "@/components/ui/skeleton";
import { ListRowsSkeleton, PageHeaderSkeleton } from "@/components/loading/page-skeletons";

function PlanSkeleton() {
  return (
    <div className="space-y-6">
      <div className="-mx-4 mb-2 flex h-12 items-center gap-3 border-b border-hairline px-4 sm:-mx-6 sm:px-6">
        <Skeleton className="h-7 w-28 rounded-md" />
        <Skeleton className="h-7 w-24 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-7 w-20 rounded-md" />
        <Skeleton className="h-7 w-20 rounded-md" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
      <Skeleton className="h-3 w-48 rounded" />
      <ListRowsSkeleton rows={3} />
      <ListRowsSkeleton rows={4} />
    </div>
  );
}

export default function PlanPage() {
  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-12">
        <div className="mb-6 sm:mb-8">
          <p className="type-caption-upper text-muted mb-1">Timeline</p>
          <h1 className="type-display-md text-ink">Plan</h1>
          <p className="type-body-sm text-muted mt-2">
            Map out your goals, tasks, and milestones for the year ahead.
          </p>
        </div>
        <Suspense fallback={<PlanSkeleton />}>
          <PlanData />
        </Suspense>
      </div>
    </div>
  );
}
