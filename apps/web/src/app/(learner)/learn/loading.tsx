import { PageSkeleton } from "~/components/learner/skeletons";
import { Skeleton } from "~/components/ui/skeleton";

// Shared fallback for learner pages without their own skeleton.
export default function LearnLoading() {
  return (
    <PageSkeleton width="2xl" label="Memuat halaman">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full rounded-[20px]" />
      <Skeleton className="h-40 w-full rounded-[20px]" />
    </PageSkeleton>
  );
}
