import { Skeleton } from "~/components/ui/skeleton";

export default function CoursesLoading() {
  return (
    <div className="w-full space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </header>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg sm:h-32" />
        ))}
      </section>

      <div className="overflow-hidden rounded-lg border">
        <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-9 w-full sm:w-72" />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-28 items-center gap-3 border-b px-4 py-4 last:border-b-0 sm:gap-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-36 sm:w-48" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-3 w-56 max-w-full" />
              <div className="flex gap-4 sm:hidden">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="hidden h-4 w-36 sm:block" />
            <Skeleton className="hidden h-4 w-24 lg:block" />
            <Skeleton className="size-4 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
