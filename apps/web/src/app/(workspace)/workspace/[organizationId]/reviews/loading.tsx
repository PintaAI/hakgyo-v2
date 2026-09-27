import { Skeleton } from "~/components/ui/skeleton";

export default function ReviewsLoading() {
  return (
    <div className="flex w-full flex-col gap-6" aria-label="Memuat review">
      <header className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[5.5rem] rounded-xl" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-full sm:w-64" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="divide-y rounded-xl border">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 p-3">
            <div className="w-40 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
