import { PageSkeleton } from "~/components/learner/skeletons";
import { Skeleton } from "~/components/ui/skeleton";

export default function AssessmentEventsLoading() {
  return (
    <PageSkeleton
      width="3xl"
      label="Memuat event tugas"
      className="max-w-6xl gap-8"
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-52 rounded-lg" />
        <Skeleton className="h-52 rounded-lg" />
      </div>
    </PageSkeleton>
  );
}
