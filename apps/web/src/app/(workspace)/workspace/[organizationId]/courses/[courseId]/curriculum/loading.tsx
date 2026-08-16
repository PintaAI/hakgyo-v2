import { Skeleton } from "~/components/ui/skeleton";

export default function CurriculumLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <Skeleton className="h-9 w-36" />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-card rounded-lg border">
            <div className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-9 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-56 max-w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <div className="divide-y border-t">
              {Array.from({ length: 2 }).map((_, itemIndex) => (
                <div
                  key={itemIndex}
                  className="flex items-center gap-3 px-4 py-3 pl-16"
                >
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
