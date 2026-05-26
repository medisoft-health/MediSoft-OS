import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the MediLab "new result" entry page. Patient picker on
 * top, panel/meta in the middle, rows below, sticky save bar at the
 * bottom.
 */
export default function NewLabLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
