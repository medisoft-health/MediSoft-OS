import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the read-only prescription detail page. Mirrors the
 * header card + instructions + safety snapshot blocks.
 */
export default function PrescriptionDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}
