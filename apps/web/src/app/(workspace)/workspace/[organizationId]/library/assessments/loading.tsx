import { Skeleton } from "~/components/ui/skeleton";

export default function AssessmentsLoading() {
  return (
    <div className="flex w-full flex-col gap-6" aria-label="Memuat tugas">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
