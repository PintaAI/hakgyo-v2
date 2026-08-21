import { Skeleton } from "~/components/ui/skeleton";

export default function LearningCoursesLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-72 rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="hidden h-72 rounded-lg xl:block" />
      </div>
    </div>
  );
}
