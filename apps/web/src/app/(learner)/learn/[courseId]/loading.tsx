import { Skeleton } from "~/components/ui/skeleton";

export default function LearningCourseLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-8"
      aria-label="Memuat kursus"
    >
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-64 rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
