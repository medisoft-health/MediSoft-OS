import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the scan-detail page: header, disclaimer, image viewer,
 * AI report, findings.
 */
export default function ScanDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-[480px] rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
    </div>
  );
}
