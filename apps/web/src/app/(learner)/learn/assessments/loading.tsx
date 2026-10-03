import { PageSkeleton } from "~/components/learner/skeletons";
import { Skeleton } from "~/components/ui/skeleton";

export default function PracticeLoading() {
  return (
    <PageSkeleton width="3xl" label="Memuat Latihan">
      <Skeleton className="h-8 w-32" />
      <div className="flex flex-col gap-3 pt-1">
        <Skeleton className="h-3 w-24" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-[20px]" />
          <Skeleton className="h-28 rounded-[20px]" />
        </div>
      </div>
    </PageSkeleton>
  );
}
