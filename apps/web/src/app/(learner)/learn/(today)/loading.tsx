import {
  FlipDeckSkeleton,
  PageSkeleton,
  QuestionSkeleton,
  StreakSkeleton,
} from "~/components/learner/skeletons";
import { Skeleton } from "~/components/ui/skeleton";

export default function TodayLoading() {
  return (
    <PageSkeleton width="2xl" label="Memuat Hari ini" className="gap-8">
      <Skeleton className="h-8 w-64 max-w-full" />
      <StreakSkeleton />
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <FlipDeckSkeleton />
      </section>
      <section className="flex flex-col gap-4">
        <Skeleton className="h-6 w-36" />
        <QuestionSkeleton />
      </section>
    </PageSkeleton>
  );
}
