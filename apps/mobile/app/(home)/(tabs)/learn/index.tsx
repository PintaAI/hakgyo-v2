import { Stack } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import {
  CohortCard,
  type CohortEvent,
  type LearnCohort,
} from "../../../../src/components/learn/cohort-card";
import type { CohortMilestoneGroup } from "../../../../src/components/learn/milestone-section";
import {
  QueryState,
  StudyScreen,
} from "../../../../src/components/learning-ui";
import { isStaleClosedOnDemandAssessment } from "../../../../src/lib/assessment-state";
import { authClient } from "../../../../src/lib/auth-client";
import { api } from "../../../../src/lib/trpc";
import { useDrawer } from "../../../../src/providers/DrawerProvider";
import { toolbarIcons } from "../../../../src/theme/toolbar-icons";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";

function CohortCarousel({
  cohorts,
  eventsByCohort,
  eventsError,
  eventsPending,
  milestonesByCohort,
  now,
  onRetryEvents,
  organizationId,
  userId,
}: {
  cohorts: LearnCohort[];
  eventsByCohort: Map<string, CohortEvent[]>;
  eventsError?: { message: string } | null;
  eventsPending: boolean;
  milestonesByCohort: Map<string, CohortMilestoneGroup>;
  now: number;
  onRetryEvents: () => void;
  organizationId: string;
  userId: string;
}) {
  const [pageWidth, setPageWidth] = useState(0);
  const listRef = useRef<FlatList<LearnCohort>>(null);
  const restoredPosition = useRef(false);
  const storageKey = `hakgyo:learn-cohort:v1:${userId}:${organizationId}`;
  const [savedCohortId, setSavedCohortId] = useState<string | null>(() => {
    try {
      return Storage.getItemSync(storageKey);
    } catch {
      return null;
    }
  });

  const measurePage = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== pageWidth) setPageWidth(nextWidth);
  };

  const savedIndex = cohorts.findIndex(({ id }) => id === savedCohortId);

  useEffect(() => {
    if (pageWidth <= 0 || cohorts.length === 0 || restoredPosition.current) {
      return;
    }
    restoredPosition.current = true;
    if (savedIndex < 0) return;

    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: pageWidth * savedIndex,
        animated: false,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [cohorts.length, pageWidth, savedIndex]);

  function savePosition(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (pageWidth <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    const cohort = cohorts[index];
    if (!cohort) return;

    setSavedCohortId(cohort.id);
    try {
      Storage.setItemSync(storageKey, cohort.id);
    } catch {
      // A scroll position is optional and can be restored on the next mount.
    }
  }

  return (
    <View className="w-full" onLayout={measurePage}>
      {pageWidth > 0 ? (
        <FlatList
          ref={listRef}
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
          onMomentumScrollEnd={savePosition}
          renderItem={({ item: cohort }) => (
            <View style={{ width: pageWidth }}>
              <CohortCard
                cohort={cohort}
                thumbnailUrl={cohort.course.thumbnailUrl}
                events={eventsByCohort.get(cohort.id) ?? []}
                eventsError={eventsError}
                eventsPending={eventsPending}
                milestoneGroup={milestonesByCohort.get(cohort.id)}
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
  const { open } = useDrawer();
  const { data: session } = authClient.useSession();
  const { activeOrganizationId } = useAppTheme();
  const organizationScope = {
    organizationId: activeOrganizationId ?? undefined,
  };
  const queryOptions = { enabled: Boolean(activeOrganizationId) };
  const cohortsQuery = api.learning.listMyCohorts.useQuery(
    organizationScope,
    queryOptions,
  );
  const eventsQuery = api.assessmentEvent.listForLearner.useQuery(
    organizationScope,
    queryOptions,
  );
  const milestonesQuery = api.learning.listMyCohortMilestones.useQuery(
    organizationScope,
    queryOptions,
  );
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
  const milestonesByCohort = useMemo(
    () =>
      new Map(
        (milestonesQuery.data ?? []).map((group) => [group.cohortId, group]),
      ),
    [milestonesQuery.data],
  );
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.menu}
          accessibilityLabel="Open menu"
          onPress={open}
        />
      </Stack.Toolbar>
      {/* Mock: two buttons in one placement render as a joined group. */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={toolbarIcons.search}
          accessibilityLabel="Search"
          onPress={() => Alert.alert("Search", "Mock search (not wired yet).")}
        />
        <Stack.Toolbar.Button
          icon={toolbarIcons.notifications}
          accessibilityLabel="Notifications"
          onPress={() =>
            Alert.alert("Notifications", "Mock notifications (not wired yet).")
          }
        />
      </Stack.Toolbar>
      <StudyScreen
        title=""
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
              key={activeOrganizationId}
              cohorts={cohorts}
              eventsByCohort={eventsByCohort}
              eventsError={eventsQuery.error}
              eventsPending={eventsQuery.isPending}
              milestonesByCohort={milestonesByCohort}
              now={now}
              onRetryEvents={() => void eventsQuery.refetch()}
              organizationId={activeOrganizationId!}
              userId={session!.user.id}
            />
          </View>
        ) : null}
      </StudyScreen>
    </>
  );
}
