import { Skeleton } from "@/components/ui/skeleton";

export default function CollegeListLoading() {
  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-12">
        <div className="mb-8 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 space-y-3">
            <Skeleton className="h-5 w-full max-w-md" />
            <Skeleton className="h-[520px] w-full rounded-lg" />
          </div>
          <div className="xl:col-span-2 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
