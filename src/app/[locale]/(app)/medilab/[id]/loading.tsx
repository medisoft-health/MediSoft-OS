import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the lab-detail page: header, AI narrative, then a list of
 * per-result range bars.
 */
export default function LabDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
