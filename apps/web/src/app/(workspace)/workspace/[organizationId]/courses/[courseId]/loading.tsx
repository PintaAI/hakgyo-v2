import { Skeleton } from "~/components/ui/skeleton";

export default function CourseWorkspaceLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <Skeleton className="h-9 w-36" />
      <header className="bg-muted rounded-lg px-5 py-6 sm:px-7 sm:py-8">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-10 w-3/4 max-w-2xl" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <div className="mt-6 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </header>

      <nav aria-label="Course management" className="border-b">
        <div className="flex min-w-max items-center gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-28 rounded-none" />
          ))}
        </div>
      </nav>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
