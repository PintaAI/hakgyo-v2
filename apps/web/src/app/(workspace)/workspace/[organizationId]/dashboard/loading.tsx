import { Skeleton } from "~/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div
      className="min-w-0 space-y-8"
      role="status"
      aria-label="Memuat dashboard"
    >
      <header className="flex flex-wrap items-end justify-between gap-5 border-b pb-8">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-full max-w-lg" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </header>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Skeleton className="h-5 w-36" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-72 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-40 rounded-lg" />
        </div>
        <div className="space-y-7">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
