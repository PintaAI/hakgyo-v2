import { Skeleton } from "~/components/ui/skeleton";

export default function InviteLoading() {
  return (
    <section className="bg-card text-card-foreground animate-pulse rounded-xl border p-6 shadow-sm">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-8 w-52" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </section>
  );
}
