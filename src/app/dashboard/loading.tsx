import { DashboardOverviewSkeleton } from "@/components/loading/page-skeletons";

export default function DashboardLoading() {
  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-12">
        <DashboardOverviewSkeleton />
      </div>
    </div>
  );
}
