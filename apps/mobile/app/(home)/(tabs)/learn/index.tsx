import { useFocusEffect } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  type FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-screens/experimental";

import {
  CohortCard,
  type CohortEvent,
  type LearnCohort,
} from "../../../../src/components/learn/cohort-card";
import { GlassBox } from "../../../../src/components/GlassBox";
import { useAutoTour } from "../../../../src/tour/tour-provider";
import { TourTarget } from "../../../../src/tour/tour-target";
import { useOpenEventMediaPrefetch } from "../../../../src/components/assessment-media";
import type { CohortMilestoneGroup } from "../../../../src/components/learn/milestone-section";
import {
  Empty,
  FullBleed,
  PageDots,
  QueryState,
} from "../../../../src/components/learning-ui";
import { TabScreen } from "../../../../src/components/tab-screen";
import { isStaleClosedOnDemandAssessment } from "../../../../src/lib/assessment-state";
import { authClient } from "../../../../src/lib/auth-client";
import {
  completeLearnCohortFocus,
  useLearnCohortFocus,
} from "../../../../src/lib/learn-cohort-focus";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { withOpacity } from "../../../../src/theme/colors";
import { useMobileSync } from "../../../../src/providers/MobileSyncProvider";
import {
  useCourseOutlines,
  useSyncIndex,
  type CourseOutline,
} from "../../../../src/sync/hooks";

// Lets the sidebar drawer finish closing so the slide to the cohort is seen.
const FOCUS_SLIDE_DELAY_MS = 380;

/**
 * Which cohort is showing, and that the others are a swipe away. Floats just
 * above the native tab bar and stays in view while the page scrolls.
 */
function CohortPageDots({
  count,
  position,
}: {
  count: number;
  position: SharedValue<number>;
}) {
  const { colors } = useAppTheme();
  return (
    // This tab draws under the tab bar (disableAutomaticContentInsets); the
    // screens SafeAreaView insets by the tab bar's height on both platforms,
    // as expo-router does for the other tabs.
    <SafeAreaView
      accessibilityElementsHidden
      edges={{ bottom: true }}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.dotsDock}
    >
      {/* Card-tinted so the dots stay legible over the content where glass
          is unavailable (Android, older iOS). */}
      <TourTarget id="learn.dots">
        <GlassBox
          glassEffectStyle="regular"
          style={[styles.dotsPill, { borderColor: colors.border }]}
          tintColor={withOpacity(colors.card, 0.7)}
        >
          <PageDots count={count} position={position} />
        </GlassBox>
      </TourTarget>
    </SafeAreaView>
  );
}

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
  pagePosition,
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
  outlines: Record<string, CourseOutline>;
  /** Receives the scroll offset in cards, for the page dots. */
  pagePosition: SharedValue<number>;
  userId: string;
}) {
  const [pageWidth, setPageWidth] = useState(0);
  const listRef = useRef<FlatList<LearnCohort>>(null);
  const storageKey = `hakgyo:learn-cohort:v1:${userId}:${organizationId}`;
  // The saved card opens first: the list renders it straight away and then
  // scrolls there, which moves the page dots along. Read once, on mount.
  const [initialIndex] = useState(() => {
    let savedCohortId: string | null = null;
    try {
      savedCohortId = Storage.getItemSync(storageKey);
    } catch {
      // No saved card: start from the first one.
    }
    const index = cohorts.findIndex(({ id }) => id === savedCohortId);
    return index > 0 ? index : undefined;
  });

  const measurePage = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== pageWidth) setPageWidth(nextWidth);
  };

  const persistCohort = useCallback(
    (cohortId: string) => {
      try {
        Storage.setItemSync(storageKey, cohortId);
      } catch {
        // A scroll position is optional and can be restored on the next mount.
      }
    },
    [storageKey],
  );

  const trackPosition = useAnimatedScrollHandler({
    onScroll: (event) => {
      const width = event.layoutMeasurement.width;
      if (width > 0) pagePosition.value = event.contentOffset.x / width;
    },
  });

  function savePosition(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (pageWidth <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    const cohort = cohorts[index];
    if (cohort) persistCohort(cohort.id);
  }

  // A cohort picked in the sidebar slides into view with the native scroll
  // animation, which also shows that the cards can be swiped.
  const focus = useLearnCohortFocus();
  useEffect(() => {
    if (!focus || pageWidth <= 0) return;
    const index = cohorts.findIndex(({ id }) => id === focus.cohortId);
    if (index < 0) {
      completeLearnCohortFocus(focus.id);
      return;
    }
    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: pageWidth * index,
        animated: true,
      });
      persistCohort(focus.cohortId);
      completeLearnCohortFocus(focus.id);
    }, FOCUS_SLIDE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [cohorts, focus, pageWidth, persistCohort]);

  return (
    <View className="w-full" onLayout={measurePage}>
      {pageWidth > 0 ? (
        <Animated.FlatList
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
          // Each card holds a whole curriculum: mount only the visible card
          // and its neighbours instead of every cohort at once.
          initialNumToRender={1}
          initialScrollIndex={
            initialIndex !== undefined && initialIndex < cohorts.length
              ? initialIndex
              : undefined
          }
          maxToRenderPerBatch={1}
          windowSize={3}
          keyExtractor={(cohort) => cohort.id}
          onMomentumScrollEnd={savePosition}
          onScroll={trackPosition}
          renderItem={({ item: cohort, index }) => (
            <View style={{ width: pageWidth }}>
              <CohortCard
                // The card in view when the tour starts; its neighbours
                // are mounted too but off screen.
                tourTarget={index === (initialIndex ?? 0)}
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
  const dashboard = useSyncIndex(activeOrganizationId);
  useOpenEventMediaPrefetch(dashboard.data?.events);
  const cohortCourseIds = useMemo(
    () => (dashboard.data?.cohorts ?? []).map((cohort) => cohort.course.id),
    [dashboard.data?.cohorts],
  );
  // Composed per course from the local bundles (progress, resume item).
  const { outlines } = useCourseOutlines(cohortCourseIds);
  const { isSyncing, syncNow } = useMobileSync();
  const [now, setNow] = useState(Date.now);
  const pagePosition = useSharedValue(0);

  // Another organization's carousel starts again from its first card (or the
  // saved one, which scrolls the dots along).
  useEffect(() => {
    pagePosition.value = 0;
  }, [activeOrganizationId, pagePosition]);

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
  useAutoTour("learn", cohorts.length > 0);
  return (
    <TabScreen
      right="updates"
      bleedTop
      contentInsetAdjustmentBehavior="never"
      overlay={
        cohorts.length > 1 ? (
          <CohortPageDots count={cohorts.length} position={pagePosition} />
        ) : null
      }
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
        <FullBleed>
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
            outlines={outlines}
            pagePosition={pagePosition}
            userId={session!.user.id}
          />
        </FullBleed>
      ) : dashboard.data && !dashboard.error ? (
        <Empty>
          Belum ada kelas di organisasi ini. Kelas muncul di sini setelah
          lembaga mendaftarkan kamu. Sementara itu, lanjutkan latihan Hangeul
          dan kosakata dari tab Hari Ini.
        </Empty>
      ) : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  dotsDock: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    flex: 0,
    alignItems: "center",
  },
  dotsPill: {
    marginBottom: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
});
