import { Skeleton } from "~/components/ui/skeleton";

export default function NewMaterialLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-9 rounded-md" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <section className="bg-card min-w-0 overflow-hidden rounded-xl border shadow-xs">
          <div className="space-y-2 border-b px-5 py-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="min-h-[32rem] space-y-3 px-5 py-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
            <Skeleton className="h-4 w-2/3" />
          </div>
        </section>

        <aside className="bg-card grid gap-5 rounded-xl border p-5 shadow-xs">
          <div className="grid gap-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        </aside>
      </div>
    </div>
  );
}
