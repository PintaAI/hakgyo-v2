import { Skeleton } from "~/components/ui/skeleton";

export default function NewVocabularyLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-9 rounded-md" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="bg-card rounded-xl border p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <div className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-14 w-full" />
          </div>
          <Skeleton className="h-10 w-28 self-end" />
        </div>
      </div>
    </div>
  );
}
