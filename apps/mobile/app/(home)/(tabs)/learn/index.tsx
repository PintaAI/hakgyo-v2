import { useEffect, useMemo, useState } from "react";
import { FlatList, View, type LayoutChangeEvent } from "react-native";

import {
  CohortCard,
  type CohortEvent,
  type LearnCohort,
} from "../../../../src/components/learn/cohort-card";
import {
  CohortMilestonesSection,
  EmptyMilestones,
} from "../../../../src/components/learn/milestone-section";
import {
  QueryState,
  StudyScreen,
} from "../../../../src/components/learning-ui";
import { isStaleClosedOnDemandAssessment } from "../../../../src/lib/assessment-state";
import { api } from "../../../../src/lib/trpc";

function CohortCarousel({
  cohorts,
  eventsByCohort,
  eventsError,
  eventsPending,
  now,
  onRetryEvents,
}: {
  cohorts: LearnCohort[];
  eventsByCohort: Map<string, CohortEvent[]>;
  eventsError?: { message: string } | null;
  eventsPending: boolean;
  now: number;
  onRetryEvents: () => void;
}) {
  const [pageWidth, setPageWidth] = useState(0);

  const measurePage = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== pageWidth) setPageWidth(nextWidth);
  };

  return (
    <View className="w-full" onLayout={measurePage}>
      {pageWidth > 0 ? (
        <FlatList
          accessibilityRole="list"
          data={cohorts}
          decelerationRate="fast"
          disableIntervalMomentum
          getItemLayout={(_, index) => ({
            index,
            length: pageWidth,
            offset: pageWidth * index,
          })}
          horizontal
          keyExtractor={(cohort) => cohort.id}
          renderItem={({ item: cohort }) => (
            <View style={{ width: pageWidth }}>
              <CohortCard
                cohort={cohort}
                thumbnailUrl={cohort.course.thumbnailUrl}
                events={eventsByCohort.get(cohort.id) ?? []}
                eventsError={eventsError}
                eventsPending={eventsPending}
                now={now}
                isFirst
                onRetryEvents={onRetryEvents}
              />
            </View>
          )}
          scrollEnabled={cohorts.length > 1}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={pageWidth}
        />
      ) : null}
    </View>
  );
}

export default function LearnTab() {
  const cohortsQuery = api.learning.listMyCohorts.useQuery();
  const eventsQuery = api.assessmentEvent.listForLearner.useQuery();
  const milestonesQuery = api.learning.listMyCohortMilestones.useQuery();
  const utils = api.useUtils();
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const cohorts: LearnCohort[] = useMemo(
    () =>
      (cohortsQuery.data ?? []).map((cohort) => ({
        ...cohort,
        learnerCount: cohort._count.enrollments,
        facilitators: cohort.staff.map((member) => ({
          name: member.organizationMember.user.name,
          image: member.organizationMember.user.image,
        })),
      })),
    [cohortsQuery.data],
  );
  const eventsByCohort = useMemo(() => {
    const map = new Map<string, CohortEvent[]>();
    for (const event of eventsQuery.data ?? []) {
      if (isStaleClosedOnDemandAssessment(event, now)) continue;
      const cohortId = event.cohort?.id;
      if (!cohortId) continue;
      const list = map.get(cohortId);
      if (list) list.push(event);
      else map.set(cohortId, [event]);
    }
    return map;
  }, [eventsQuery.data, now]);
  return (
    <StudyScreen
      title="Learn"
      headerShown={false}
      bleedTop
      contentInsetAdjustmentBehavior="never"
      refreshing={
        cohortsQuery.isRefetching ||
        eventsQuery.isRefetching ||
        milestonesQuery.isRefetching
      }
      onRefresh={() => {
        void utils.learning.invalidate();
        void utils.assessmentEvent.invalidate();
      }}
    >
      <QueryState
        pending={cohortsQuery.isPending}
        error={cohortsQuery.error}
        retry={() => void cohortsQuery.refetch()}
      />
      {cohorts.length > 0 ? (
        <View className="-mx-5">
          <CohortCarousel
            cohorts={cohorts}
            eventsByCohort={eventsByCohort}
            eventsError={eventsQuery.error}
            eventsPending={eventsQuery.isPending}
            now={now}
            onRetryEvents={() => void eventsQuery.refetch()}
          />
        </View>
      ) : null}
      {!cohortsQuery.isPending && !cohortsQuery.error ? (
        <CohortMilestonesSection
          groups={milestonesQuery.data}
          pending={milestonesQuery.isPending}
          error={milestonesQuery.error}
          retry={() => void milestonesQuery.refetch()}
        />
      ) : null}
      {!cohortsQuery.isPending &&
      !cohortsQuery.error &&
      !milestonesQuery.isPending &&
      !milestonesQuery.error &&
      (milestonesQuery.data ?? []).every(
        (group) => group.milestones.length === 0,
      ) ? (
        <EmptyMilestones />
      ) : null}
    </StudyScreen>
  );
}
