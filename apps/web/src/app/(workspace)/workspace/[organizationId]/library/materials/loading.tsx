import { Skeleton } from "~/components/ui/skeleton";

export default function MaterialsLoading() {
  return (
    <div className="flex w-full flex-col gap-6" aria-label="Memuat materi">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-8 w-64 max-w-full" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
