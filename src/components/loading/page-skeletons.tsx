import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton({
  subtitle = true,
}: {
  subtitle?: boolean;
}) {
  return (
    <div className="mb-8">
      <Skeleton className="mb-2 h-3 w-20" />
      <Skeleton className="h-9 w-56 max-w-full" />
      {subtitle ? <Skeleton className="mt-3 h-4 w-full max-w-md" /> : null}
    </div>
  );
}

export function StageCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-hairline bg-surface-card px-5 py-4"
        >
          <Skeleton className="h-4 w-5 shrink-0" />
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full max-w-xs" />
          </div>
          <Skeleton className="h-4 w-4 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSidebarCardSkeleton() {
  return (
    <div className="rounded-lg border border-hairline bg-surface-card overflow-hidden">
      <div className="px-5 py-5 border-b border-hairline">
        <div className="flex items-start gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="mt-4 h-3 w-24" />
      </div>
      <div className="px-5 py-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-hairline bg-surface-soft space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-pill" />
      </div>
    </div>
  );
}

export function ListRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-card overflow-hidden divide-y divide-hairline">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ScholarshipCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-hairline bg-surface-card p-5"
        >
          <div className="flex gap-3">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-36" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-md" />
        ))}
      </div>
      <div className="space-y-5 rounded-lg border border-hairline bg-surface-card p-4 sm:p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={cnMessageAlign(i)}
        >
          <Skeleton className={cnBubble(i)} />
        </div>
      ))}
      <div className="mt-auto border-t border-hairline pt-4">
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}

function cnMessageAlign(i: number) {
  return i % 2 === 0 ? "flex justify-start" : "flex justify-end";
}

function cnBubble(i: number) {
  const widths = ["h-16 w-[72%]", "h-12 w-[55%]", "h-20 w-[65%]"];
  return `${widths[i % widths.length]} rounded-lg`;
}

export function DashboardOverviewSkeleton() {
  return (
    <>
      <PageHeaderSkeleton subtitle={false} />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <div>
            <Skeleton className="mb-3 h-3 w-28" />
            <StageCardsSkeleton count={3} />
          </div>
          <div>
            <Skeleton className="mb-3 h-3 w-12" />
            <div className="grid grid-cols-2 gap-2.5">
              <Skeleton className="h-[58px] rounded-lg" />
              <Skeleton className="h-[58px] rounded-lg" />
            </div>
          </div>
        </div>
        <aside className="w-full lg:w-72 xl:w-80 shrink-0">
          <ProfileSidebarCardSkeleton />
        </aside>
      </div>
    </>
  );
}

export function SidebarUserSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5">
      <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2.5 w-32" />
      </div>
    </div>
  );
}
