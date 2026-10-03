import {
  BackLinkSkeleton,
  ButtonSkeleton,
  CardSkeleton,
  PageSkeleton,
} from "~/components/learner/skeletons";
import { Skeleton } from "~/components/ui/skeleton";

export default function CardsLoading() {
  return (
    <PageSkeleton width="xl" label="Memuat Kartu" className="gap-5">
      <BackLinkSkeleton className="w-44" />
      <CardSkeleton className="p-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-3/4" />
        <div className="flex justify-between gap-5">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-8 w-12" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-4 w-full" />
        <ButtonSkeleton className="h-11" />
      </CardSkeleton>
    </PageSkeleton>
  );
}
