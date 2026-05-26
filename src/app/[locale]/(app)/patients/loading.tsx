import { Skeleton } from "@/components/ui/skeleton";

/**
 * Patients list skeleton — matches the actual layout: header (wraps on
 * narrow), filter bar (wraps), then patient cards grid.
 */
export default function PatientsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-full max-w-md flex-1 rounded-lg" />
        <Skeleton className="h-10 w-[140px] rounded-lg" />
        <Skeleton className="h-10 w-[140px] rounded-lg" />
        <Skeleton className="h-10 w-[160px] rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
