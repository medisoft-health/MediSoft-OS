import { Skeleton } from "@/components/ui/skeleton";

/**
 * MediScript skeleton — matches breadcrumb + header + hero CTA + sessions table
 * layout of the actual page.
 */
export default function MediScriptLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Breadcrumb */}
      <Skeleton className="h-3 w-24" />

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-52" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Hero CTA card */}
      <div className="rounded-2xl border border-[color:var(--color-border)] overflow-hidden">
        <Skeleton className="h-1.5 w-full" />
        <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
          <Skeleton className="h-11 w-28 rounded-lg" />
        </div>
      </div>

      {/* Recent sessions card */}
      <div className="rounded-2xl border border-[color:var(--color-border)]">
        <div className="space-y-1.5 p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="px-0">
          {/* Table header */}
          <div className="flex items-center gap-6 border-b border-[color:var(--color-border)] py-3 px-6">
            {[80, 140, 80, 72].map((w, i) => (
              <Skeleton key={i} className="h-3" style={{ width: w }} />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-6 border-b border-[color:var(--color-border)] py-4 px-6"
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Features card */}
      <div className="rounded-2xl border border-[color:var(--color-border)] p-6 space-y-4">
        <Skeleton className="h-5 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
