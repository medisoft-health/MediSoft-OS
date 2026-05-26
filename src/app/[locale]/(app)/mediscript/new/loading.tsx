import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the MediScript "new session" wizard. Mirrors the 4-step
 * shell + the active step body so the layout doesn't shift on hydration.
 */
export default function NewMediscriptLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      {/* Breadcrumb + heading */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      {/* Active step body */}
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
