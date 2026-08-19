import { Skeleton } from "~/components/ui/skeleton";

export default function ReviewsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="h-20 w-44" />
      </header>
      <section className="bg-card rounded-lg border p-5 shadow-sm sm:p-6">
        <div className="flex justify-between gap-4 border-b pb-5">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-5 pt-6">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </section>
    </div>
  );
}
