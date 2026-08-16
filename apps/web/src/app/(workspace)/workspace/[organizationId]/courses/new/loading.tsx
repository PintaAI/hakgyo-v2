import { Skeleton } from "~/components/ui/skeleton";

export default function NewCourseLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <Skeleton className="h-9 w-36" />
      <header className="max-w-2xl space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </header>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="bg-card ring-foreground/10 space-y-5 rounded-lg p-5 ring-1 sm:p-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-28 w-full" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
        <aside className="space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </aside>
      </div>
    </div>
  );
}
