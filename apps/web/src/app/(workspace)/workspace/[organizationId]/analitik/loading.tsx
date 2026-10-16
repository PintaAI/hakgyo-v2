import { Skeleton } from "~/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat analitik">
      <div className="grid grid-cols-2 gap-4 border-y py-5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl max-sm:rounded-none" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl max-sm:rounded-none" />
        <Skeleton className="h-72 rounded-2xl max-sm:rounded-none" />
      </div>
    </div>
  );
}
