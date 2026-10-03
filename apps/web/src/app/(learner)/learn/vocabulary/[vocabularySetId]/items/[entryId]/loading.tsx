import { PageSkeleton } from "~/components/learner/skeletons";
import { Skeleton } from "~/components/ui/skeleton";

export default function VocabularyEntryLoading() {
  return (
    <PageSkeleton width="xl" label="Memuat kata">
      <div className="flex flex-col gap-3">
        <Skeleton className="mx-auto h-3 w-24" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="size-11 rounded-full" />
        </div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-1 w-full rounded-full" />
      </div>
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="border-border flex flex-col gap-2 border-t pt-5">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
    </PageSkeleton>
  );
}
