import { Skeleton } from "@/components/ui/skeleton";

export default function PatientDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 pb-12 lg:px-8">
      {/* Header skeleton */}
      <div className="-mx-6 border-b border-[color:var(--color-border)] bg-[color:var(--color-card)] px-6 py-5 lg:-mx-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Skeleton className="mb-3 h-4 w-24" />
          <div className="flex flex-wrap items-start gap-5">
            <Skeleton className="size-16 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-80" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-96 rounded-md" />

      {/* Body skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
