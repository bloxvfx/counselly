import {
  PageHeaderSkeleton,
  ScholarshipCardsSkeleton,
} from "@/components/loading/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScholarshipsLoading() {
  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-12">
        <div className="mb-8">
          <p className="type-caption-upper text-muted mb-1">Funding</p>
          <h1 className="type-display-md text-ink">Scholarships</h1>
          <Skeleton className="mt-3 h-4 w-full max-w-lg" />
        </div>
        <ScholarshipCardsSkeleton count={5} />
      </div>
    </div>
  );
}
