import { Suspense } from "react";
import { DashboardOverviewContent } from "./dashboard-overview-content";
import { DashboardOverviewSkeleton } from "@/components/loading/page-skeletons";

export default function DashboardOverviewPage() {
  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-12">
        <Suspense fallback={<DashboardOverviewSkeleton />}>
          <DashboardOverviewContent />
        </Suspense>
      </div>
    </div>
  );
}
