import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard skeleton — matches greeting + KPI cards + two-column schedule/activity
 * + module cards to minimise layout shift while the server fetches data.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-7 w-48 rounded-full" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[color:var(--color-border)] p-5"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="size-10 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Two-column: Today's schedule + Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Schedule card */}
        <div className="rounded-2xl border border-[color:var(--color-border)]">
          <div className="flex items-center justify-between p-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-2 px-6 pb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl px-2 py-2"
              >
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Activity card */}
        <div className="rounded-2xl border border-[color:var(--color-border)]">
          <div className="space-y-2 p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="space-y-2 px-6 pb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl px-2 py-2"
              >
                <Skeleton className="mt-1.5 size-1.5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module cards */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[color:var(--color-border)]"
            >
              <Skeleton className="h-2 rounded-t-2xl" />
              <div className="space-y-3 p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center justify-between border-t border-[color:var(--color-border)] pt-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="size-4 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
