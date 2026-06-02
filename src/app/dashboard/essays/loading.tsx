import { PageHeaderSkeleton, ListRowsSkeleton } from "@/components/loading/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function EssaysLoading() {
  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-12">
        <PageHeaderSkeleton />
        <div className="space-y-4">
          <Skeleton className="h-9 w-32" />
          <ListRowsSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}
