import { Skeleton } from "@/components/ui/skeleton";

/**
 * Patients list skeleton — matches header + filters + table rows
 * to minimise layout shift while the server fetches patient data.
 */
export default function PatientsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Table header */}
      <div className="space-y-0">
        <div className="flex items-center gap-4 border-b border-[color:var(--color-border)] py-3 px-2">
          {[120, 80, 72, 56, 96, 80, 72, 48].map((w, i) => (
            <Skeleton key={i} className="h-3" style={{ width: w }} />
          ))}
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[color:var(--color-border)] py-4 px-2"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-3 w-16 font-mono" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-10 rounded-full" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-10 rounded-md" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
