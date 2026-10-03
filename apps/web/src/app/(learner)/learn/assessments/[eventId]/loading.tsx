import {
  BackLinkSkeleton,
  ButtonSkeleton,
  CardSkeleton,
  PageSkeleton,
  RowsSkeleton,
} from "~/components/learner/skeletons";
import { Skeleton } from "~/components/ui/skeleton";

export default function AssessmentEventLoading() {
  return (
    <PageSkeleton width="2xl" label="Memuat event">
      <BackLinkSkeleton className="-mb-2 w-24" />
      <CardSkeleton>
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <ButtonSkeleton className="h-11" />
      </CardSkeleton>
      <CardSkeleton>
        <Skeleton className="h-6 w-36" />
        <RowsSkeleton />
      </CardSkeleton>
    </PageSkeleton>
  );
}
