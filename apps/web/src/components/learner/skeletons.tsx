import type { ReactNode } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

/** Same width and rhythm as the pages they stand in for, so nothing shifts when content arrives. */
export function PageSkeleton({
  width,
  label,
  className,
  children,
}: {
  width: "xl" | "2xl" | "3xl";
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn(
        "mx-auto flex w-full flex-col gap-6",
        { xl: "max-w-xl", "2xl": "max-w-2xl", "3xl": "max-w-3xl" }[width],
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The rounded surface of `StudyCard`, filled with skeleton lines. */
export function CardSkeleton({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-card ring-foreground/10 flex flex-col gap-4 rounded-[20px] p-5 ring-1",
        // The default muted fill disappears on a card surface.
        "[&_[data-slot=skeleton]]:bg-foreground/10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BackLinkSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-8 w-32 rounded-full", className)} />;
}

export function ButtonSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-full rounded-full", className)} />;
}

/** Weekly streak: heading row and seven day circles. */
export function StreakSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>
      <div className="flex">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <Skeleton className="h-2.5 w-6" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Flip-card practice: caption, progress, the card and the answer field. */
export function FlipDeckSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-1 w-full rounded-full" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="mx-auto h-64 w-full max-w-md rounded-2xl" />
      <Skeleton className="mx-auto h-11 w-full max-w-md rounded-full" />
      <div className="flex justify-center gap-2">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-36 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
    </div>
  );
}

/** Question card with its answer options. */
export function QuestionSkeleton({ options = 3 }: { options?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <CardSkeleton>
        <div className="flex flex-col gap-2 pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-14" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-5 w-4/5" />
      </CardSkeleton>
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: options }).map((_, index) => (
        <CardSkeleton key={index} className="flex-row items-center p-4">
          <Skeleton className="size-8 rounded-xl" />
          <Skeleton className="h-4 w-1/2" />
        </CardSkeleton>
      ))}
    </div>
  );
}

/** Rail rows of the course outline: a module header and its items. */
export function OutlineSkeleton({ modules = 2 }: { modules?: number }) {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: modules }).map((_, moduleIndex) => (
        <div
          key={moduleIndex}
          className={cn(
            "flex flex-col gap-6",
            moduleIndex > 0 && "border-border border-t pt-6",
          )}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="h-5 w-48 max-w-full" />
          </div>
          <div className="ml-3 flex flex-col gap-6 pl-1">
            {Array.from({ length: 2 }).map((_, itemIndex) => (
              <div key={itemIndex} className="flex items-start gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Cohort card of Belajar: header, the hero action, to-do rows and the curriculum. */
export function CohortCardSkeleton() {
  return (
    <div className="bg-card ring-foreground/10 [&_[data-slot=skeleton]]:bg-foreground/10 overflow-hidden rounded-[20px] ring-1">
      <div className="bg-muted/60 flex flex-col gap-2 p-4 pt-8 sm:p-6 sm:pt-12">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-24 w-full rounded-[20px]" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-36" />
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-9 w-full rounded-full" />
        <OutlineSkeleton modules={1} />
      </div>
    </div>
  );
}

/** Closing "Siap lanjut?" footer of an item. */
export function LearningFooterSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-52" />
        <Skeleton className="h-1 w-full rounded-full" />
      </div>
      <div className="border-border flex flex-col gap-2 border-t pt-5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-3/5" />
      </div>
      <ButtonSkeleton className="h-11" />
    </div>
  );
}

/** Rows of a leaderboard or word list. */
export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="border-border/60 flex flex-col gap-1.5 border-b py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
      ))}
    </div>
  );
}
