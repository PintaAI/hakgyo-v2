import { Skeleton } from "~/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="w-full space-y-10">
      <header className="border-border relative overflow-hidden rounded-xl border p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 space-y-3">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <Skeleton className="h-7 w-28 rounded-md" />
        </div>
        <div className="border-border mt-6 grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-md" />
          ))}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-lg lg:col-span-2" />
        <div className="grid gap-4">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </section>

      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}
