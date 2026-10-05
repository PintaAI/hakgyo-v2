import {
  BackLinkSkeleton,
  OutlineSkeleton,
  PageSkeleton,
} from "~/components/learner/skeletons";
import { Skeleton } from "~/components/ui/skeleton";

export default function LearningCourseLoading() {
  return (
    <PageSkeleton width="3xl" label="Memuat kurikulum" className="gap-8">
      <BackLinkSkeleton className="-mb-4 w-24" />
      <Skeleton className="h-44 w-full rounded-[20px]" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <OutlineSkeleton />
    </PageSkeleton>
  );
}
