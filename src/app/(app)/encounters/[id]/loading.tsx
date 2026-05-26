import { Skeleton } from "@/components/ui/skeleton";

export default function EncounterDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-28 rounded-2xl" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-2xl" />
      ))}
    </div>
  );
}
