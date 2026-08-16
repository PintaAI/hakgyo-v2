import { Skeleton } from "~/components/ui/skeleton";

export default function UserDocLoading() {
  return (
    <div>
      <div className="mx-auto mb-5 flex w-full max-w-4xl items-center gap-2">
        <Skeleton className="h-6 w-12 rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-8 h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    </div>
  );
}
