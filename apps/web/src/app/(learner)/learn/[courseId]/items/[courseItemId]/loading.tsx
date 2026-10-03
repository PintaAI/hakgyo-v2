import {
  BackLinkSkeleton,
  LearningFooterSkeleton,
  PageSkeleton,
} from "~/components/learner/skeletons";
import { Skeleton } from "~/components/ui/skeleton";

export default function CourseItemLoading() {
  return (
    <PageSkeleton width="3xl" label="Memuat aktivitas" className="gap-5">
      <div className="flex items-center justify-between">
        <BackLinkSkeleton />
        <Skeleton className="size-9 rounded-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-3 h-44 w-full rounded-2xl" />
      </div>
      <div className="border-border mt-6 border-t pt-8">
        <LearningFooterSkeleton />
      </div>
    </PageSkeleton>
  );
}
