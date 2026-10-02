"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CompassIcon } from "lucide-react";

import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { buttonVariants } from "~/components/ui/button";
import { isStaleClosedOnDemandAssessment } from "~/lib/learner/assessment-state";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { CohortCard, type CohortEvent } from "./cohort-card";

const storageKey = (userId: string) => `hakgyo:learn-cohort:v1:${userId}`;

export function LearnTab({ userId }: { userId: string }) {
  const cohortsQuery = api.learning.listMyCohorts.useQuery();
  const eventsQuery = api.assessmentEvent.listForLearner.useQuery();
  const milestonesQuery = api.learning.listMyCohortMilestones.useQuery();
  const [now, setNow] = useState(Date.now);
  // Read on first render: nothing depends on it until the cohorts have loaded,
  // so server and client markup still agree.
  const [pickedId, setPickedId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(storageKey(userId));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const cohorts = cohortsQuery.data;
  const selected =
    cohorts?.find((cohort) => cohort.id === pickedId) ?? cohorts?.[0];
  const outlineQuery = api.learning.getCourseOutline.useQuery(
    { courseId: selected?.course.id ?? "" },
    { enabled: Boolean(selected) },
  );

  const eventsByCohort = useMemo(() => {
    const map = new Map<string, CohortEvent[]>();
    for (const event of eventsQuery.data ?? []) {
      if (isStaleClosedOnDemandAssessment(event, now)) continue;
      const cohortId = event.cohort?.id;
      if (!cohortId) continue;
      map.set(cohortId, [...(map.get(cohortId) ?? []), event]);
    }
    return map;
  }, [eventsQuery.data, now]);

  if (cohortsQuery.isPending) {
    return <Skeleton className="h-[32rem] w-full rounded-[20px]" />;
  }
  if (cohortsQuery.isError) {
    return (
      <p role="alert" className="text-destructive text-sm">
        Course belum bisa dimuat.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => void cohortsQuery.refetch()}
        >
          Coba lagi
        </button>
      </p>
    );
  }
  if (!cohorts?.length || !selected) {
    return (
      <EmptyState
        icon={CompassIcon}
        title="Belum ada course"
        description="Jelajahi katalog dan pilih course pertama untuk mulai membangun progress belajar."
        action={
          <Link
            href="/catalog"
            className={buttonVariants({ className: "mt-4" })}
          >
            Jelajahi katalog
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {cohorts.length > 1 ? (
        <nav
          aria-label="Group belajar"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {cohorts.map((cohort) => (
            <button
              key={cohort.id}
              type="button"
              aria-pressed={cohort.id === selected.id}
              onClick={() => {
                setPickedId(cohort.id);
                try {
                  localStorage.setItem(storageKey(userId), cohort.id);
                } catch {
                  // The last cohort is optional.
                }
              }}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                cohort.id === selected.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {cohort.name}
            </button>
          ))}
        </nav>
      ) : null}
      <CohortCard
        key={selected.id}
        cohort={selected}
        events={eventsByCohort.get(selected.id) ?? []}
        eventsPending={eventsQuery.isPending}
        eventsError={eventsQuery.isError}
        now={now}
        outline={outlineQuery.data}
        milestoneGroup={milestonesQuery.data?.find(
          (group) => group.cohortId === selected.id,
        )}
      />
    </div>
  );
}
