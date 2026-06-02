import { Skeleton } from "@/components/ui/skeleton";
import { ListRowsSkeleton, PageHeaderSkeleton } from "@/components/loading/page-skeletons";

export default function PlanLoading() {
  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-12">
        <PageHeaderSkeleton />
        <div className="space-y-3">
          <div className="-mx-4 mb-5 flex h-12 items-center gap-3 border-b border-hairline px-4 sm:-mx-6 sm:px-6">
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
            <div className="flex-1" />
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
          <ListRowsSkeleton rows={3} />
          <ListRowsSkeleton rows={4} />
          <ListRowsSkeleton rows={2} />
        </div>
      </div>
    </div>
  );
}
