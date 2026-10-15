import { Skeleton } from "~/components/ui/skeleton";

export default function DocsLoading() {
  return (
    <div className="flex w-full items-center justify-center py-24">
      <div className="flex items-center gap-3">
        <Skeleton className="size-5 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
