import { Skeleton } from "~/components/ui/skeleton";

export default function AuthContinueLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl items-center justify-center py-24">
      <div className="flex items-center gap-3">
        <Skeleton className="size-5 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}
