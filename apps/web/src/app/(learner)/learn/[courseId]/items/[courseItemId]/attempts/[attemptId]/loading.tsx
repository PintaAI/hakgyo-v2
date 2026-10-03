import { PageSkeleton, QuestionSkeleton } from "~/components/learner/skeletons";
import { Skeleton } from "~/components/ui/skeleton";

export default function AttemptLoading() {
  return (
    <PageSkeleton width="2xl" label="Memuat tugas" className="gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      </div>
      <QuestionSkeleton />
    </PageSkeleton>
  );
}
