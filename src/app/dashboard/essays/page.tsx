import { Suspense } from "react";
import { EssaysData } from "./essays-data";
import { ListRowsSkeleton } from "@/components/loading/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

function EssaysSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-32" />
      <ListRowsSkeleton rows={4} />
    </div>
  );
}

export default function EssaysPage() {
  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-12">
        <div className="mb-8">
          <p className="type-caption-upper text-muted mb-1">Applications</p>
          <h1 className="type-display-md text-ink">Essays</h1>
          <p className="type-body-sm text-muted mt-2">
            Track your drafts, word counts, and status for every essay across all
            applications.
          </p>
        </div>
        <Suspense fallback={<EssaysSkeleton />}>
          <EssaysData />
        </Suspense>
      </div>
    </div>
  );
}
