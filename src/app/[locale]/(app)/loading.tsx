import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard skeleton — matches the actual page layout:
 *   header → 4 KPI tiles → 2-col (today / activity) → 4-col modules
 * to minimise layout shift on hydration.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-6 w-44 rounded-full" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>

      {/* Today + Recent */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>

      {/* Modules */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-44" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
