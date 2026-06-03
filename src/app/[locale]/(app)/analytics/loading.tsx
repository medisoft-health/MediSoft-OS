import { Skeleton } from "@/components/ui/skeleton";

/**
 * Analytics skeleton — matches header + chart-heavy dashboard layout
 * with KPI tiles and visualisation placeholders.
 */
export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[color:var(--color-border)] p-5 space-y-3"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Primary charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[color:var(--color-border)] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Secondary charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[color:var(--color-border)] p-6 space-y-4 lg:col-span-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-[color:var(--color-border)] p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
