import { Suspense } from "react";
import { TimelineData } from "./timeline-data";
import { ListRowsSkeleton } from "@/components/loading/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

function TimelineSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
      <div>
        <Skeleton className="mb-3 h-3 w-36" />
        <ListRowsSkeleton rows={4} />
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-12">
        <div className="mb-8">
          <p className="type-caption-upper text-muted mb-1">Planning</p>
          <h1 className="type-display-md text-ink">Timeline</h1>
          <p className="type-body-sm text-muted mt-2">
            Application deadlines and key milestones across all your colleges.
          </p>
        </div>
        <Suspense fallback={<TimelineSkeleton />}>
          <TimelineData />
        </Suspense>
      </div>
    </div>
  );
}
