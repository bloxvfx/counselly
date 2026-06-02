import { Suspense } from "react";
import { CollegeListData } from "./college-list-data";
import { Skeleton } from "@/components/ui/skeleton";

function CollegeListSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 space-y-3">
        <Skeleton className="h-5 w-full max-w-md" />
        <Skeleton className="h-[520px] w-full rounded-lg" />
      </div>
      <div className="xl:col-span-2 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function CollegeListPage() {
  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-12">
        <div className="mb-6 sm:mb-8">
          <h1 className="type-display-md text-ink">College list</h1>
        </div>
        <Suspense fallback={<CollegeListSkeleton />}>
          <CollegeListData />
        </Suspense>
      </div>
    </div>
  );
}
