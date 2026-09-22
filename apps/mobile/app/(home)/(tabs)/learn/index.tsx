import type { RouterOutputs } from "@hakgyo/api";
import { Stack, useFocusEffect } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { toolbarIcons } from "../../../../src/theme/toolbar-icons";
import { SidebarToolbarButton } from "../../../../src/components/sidebar/SidebarToolbarButton";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useDrawer } from "../../../../src/providers/DrawerProvider";
import { useMobileSync } from "../../../../src/providers/MobileSyncProvider";
import { useSidebarIndicators } from "../../../../src/lib/sidebar-indicators";

function CohortCarousel({
  cohorts,
  eventsByCohort,
  eventsError,
  eventsPending,
  milestonesByCohort,
  now,
  onRetryEvents,
  organizationId,
  outlines,
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
  outlines: RouterOutputs["mobileSync"]["getDashboard"]["outlines"];
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
                outline={outlines[cohort.course.id]}
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
  const { data: session } = authClient.useSession();
  const { activeOrganizationId } = useAppTheme();
  const organizationScope = activeOrganizationId
    ? { organizationId: activeOrganizationId }
    : undefined;
  const queryOptions = { enabled: Boolean(activeOrganizationId) };
  const dashboard = api.mobileSync.getDashboard.useQuery(
    organizationScope,
    queryOptions,
  );
  const { isSyncing, syncNow } = useMobileSync();
  const { openUpdates } = useDrawer();
  const { unreadCount } = useSidebarIndicators();
  const [now, setNow] = useState(Date.now);

  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(() => setNow(Date.now()));
      const timer = setInterval(() => setNow(Date.now()), 30_000);
      return () => {
        cancelAnimationFrame(frame);
        clearInterval(timer);
      };
    }, []),
  );

  const cohorts: LearnCohort[] = useMemo(
    () =>
      (dashboard.data?.cohorts ?? []).map((cohort) => ({
        ...cohort,
        learnerCount: cohort._count.enrollments,
        facilitators: cohort.staff.map((member) => ({
          name: member.organizationMember.user.name,
          image: member.organizationMember.user.image,
        })),
      })),
    [dashboard.data?.cohorts],
  );
  const eventsByCohort = useMemo(() => {
    const map = new Map<string, CohortEvent[]>();
    for (const event of dashboard.data?.events ?? []) {
      if (isStaleClosedOnDemandAssessment(event, now)) continue;
      const cohortId = event.cohort?.id;
      if (!cohortId) continue;
      const list = map.get(cohortId);
      if (list) list.push(event);
      else map.set(cohortId, [event]);
    }
    return map;
  }, [dashboard.data?.events, now]);
  const milestonesByCohort = useMemo(
    () =>
      new Map(
        (dashboard.data?.milestones ?? []).map((group) => [
          group.cohortId,
          group,
        ]),
      ),
    [dashboard.data?.milestones],
  );
  return (
    <>
      <SidebarToolbarButton />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={toolbarIcons.notifications}
          accessibilityLabel="Open learning updates"
          onPress={openUpdates}
        >
          {unreadCount > 0 ? (
            <Stack.Toolbar.Badge>
              {unreadCount > 99 ? "99+" : String(unreadCount)}
            </Stack.Toolbar.Badge>
          ) : null}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <StudyScreen
        title=""
        bleedTop
        contentInsetAdjustmentBehavior="never"
        refreshing={dashboard.isRefetching || isSyncing}
        onRefresh={() => {
          void syncNow(activeOrganizationId ?? undefined);
        }}
      >
        <QueryState
          pending={dashboard.isPending}
          error={dashboard.error}
          retry={() => void dashboard.refetch()}
        />
        {cohorts.length > 0 ? (
          <View className="-mx-5">
            <CohortCarousel
              key={activeOrganizationId}
              cohorts={cohorts}
              eventsByCohort={eventsByCohort}
              eventsError={dashboard.error}
              eventsPending={dashboard.isPending}
              milestonesByCohort={milestonesByCohort}
              now={now}
              onRetryEvents={() => void dashboard.refetch()}
              organizationId={activeOrganizationId!}
              outlines={dashboard.data?.outlines ?? {}}
              userId={session!.user.id}
            />
          </View>
        ) : null}
      </StudyScreen>
    </>
  );
}
