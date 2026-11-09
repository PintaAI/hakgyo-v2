import { router, useFocusEffect } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-screens/experimental";

import {
  CohortCard,
  type CohortEvent,
  type LearnCohort,
} from "../../../../src/components/learn/cohort-card";
import {
  ArchivedClasses,
  type ArchivedClass,
} from "../../../../src/components/learn/archived-classes";
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
import { Pager, type PagerHandle } from "../../../../src/components/ui/pager";
import { isStaleClosedOnDemandAssessment } from "../../../../src/lib/assessment-state";
import { authClient } from "../../../../src/lib/auth-client";
import {
  completeLearnCohortFocus,
  useLearnCohortFocus,
} from "../../../../src/lib/learn-cohort-focus";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { withOpacity } from "../../../../src/theme/colors";
import { useCohortArchive } from "../../../../src/lib/use-cohort-archive";
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
  onArchive,
  onBadgeClaimed,
  onMissingFocus,
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
  onArchive: (cohort: LearnCohort) => void;
  onBadgeClaimed: () => void;
  /** A requested cohort is not in the carousel (it may be archived). */
  onMissingFocus: (cohortId: string) => void;
  onRetryEvents: () => void;
  organizationId: string;
  outlines: Record<string, CourseOutline>;
  /** Receives the scroll offset in cards, for the page dots. */
  pagePosition: SharedValue<number>;
  userId: string;
}) {
  const pager = useRef<PagerHandle>(null);
  const storageKey = `hakgyo:learn-cohort:v1:${userId}:${organizationId}`;
  // The saved card opens first: the pager renders it straight away, which
  // moves the page dots along. Read once, on mount.
  const [initialIndex] = useState(() => {
    let savedCohortId: string | null = null;
    try {
      savedCohortId = Storage.getItemSync(storageKey);
    } catch {
      // No saved card: start from the first one.
    }
    const index = cohorts.findIndex(({ id }) => id === savedCohortId);
    return index > 0 ? index : 0;
  });

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

  // A cohort picked in the sidebar slides into view with the native scroll
  // animation, which also shows that the cards can be swiped.
  const focus = useLearnCohortFocus();
  useEffect(() => {
    if (!focus) return;
    const index = cohorts.findIndex(({ id }) => id === focus.cohortId);
    if (index < 0) {
      completeLearnCohortFocus(focus.id);
      onMissingFocus(focus.cohortId);
      return;
    }
    const timer = setTimeout(() => {
      pager.current?.scrollTo(index);
      persistCohort(focus.cohortId);
      completeLearnCohortFocus(focus.id);
    }, FOCUS_SLIDE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [cohorts, focus, onMissingFocus, persistCohort]);

  // Each card holds a whole curriculum, and cards differ a lot in length:
  // the pager takes the height of the card in view instead of the longest.
  return (
    <Pager
      ref={pager}
      accessibilityRole="list"
      count={cohorts.length}
      initialIndex={initialIndex}
      position={pagePosition}
      onIndexChange={(index) => {
        const cohort = cohorts[index];
        if (cohort) persistCohort(cohort.id);
      }}
      renderPage={(index) => {
        const cohort = cohorts[index];
        if (!cohort) return null;
        return (
          <CohortCard
            // The card in view when the tour starts; its neighbours are
            // mounted too but off screen.
            tourTarget={index === initialIndex}
            cohort={cohort}
            thumbnailUrl={cohort.course.thumbnailUrl}
            events={eventsByCohort.get(cohort.id) ?? []}
            eventsError={eventsError}
            eventsPending={eventsPending}
            milestoneGroup={milestonesByCohort.get(cohort.id)}
            now={now}
            isFirst
            onRetryEvents={onRetryEvents}
            onArchive={() => onArchive(cohort)}
            onBadgeClaimed={onBadgeClaimed}
            outline={outlines[cohort.course.id]}
          />
        );
      }}
    />
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
  const insets = useSafeAreaInsets();

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
  // Finished or archived classes leave the carousel for Diarsipkan below.
  const archive = useCohortArchive(now);
  const { activeCohorts, archivedClasses } = useMemo(() => {
    const active: LearnCohort[] = [];
    const archived: ArchivedClass[] = [];
    for (const cohort of cohorts) {
      const state = archive.states.get(cohort.id);
      if (state?.archived) archived.push({ cohort, progress: state.progress });
      else active.push(cohort);
    }
    return { activeCohorts: active, archivedClasses: archived };
  }, [archive.states, cohorts]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  // A claimed badge files its class away: show where it went.
  const openArchive = useCallback(() => setArchiveOpen(true), []);
  const archiveStates = archive.states;
  const { archive: archiveCourse, restore: restoreCourse } = archive;
  const onArchive = useCallback(
    (cohort: LearnCohort) => archiveCourse(cohort.course.id),
    [archiveCourse],
  );
  // A class opened from the sidebar, a notification or Cari that sits under
  // Diarsipkan: open the list and its curriculum.
  const onMissingFocus = useCallback(
    (cohortId: string) => {
      const archived = archivedClasses.find(
        (item) => item.cohort.id === cohortId,
      );
      if (!archived) return;
      setArchiveOpen(true);
      router.push({
        pathname: "/courses/[courseId]",
        params: { courseId: archived.cohort.course.id },
      });
    },
    [archivedClasses],
  );
  // With every class archived there is no carousel to take the request.
  const focus = useLearnCohortFocus();
  const noCarousel = activeCohorts.length === 0 && archivedClasses.length > 0;
  useEffect(() => {
    if (!focus || !noCarousel) return;
    completeLearnCohortFocus(focus.id);
    onMissingFocus(focus.cohortId);
  }, [focus, noCarousel, onMissingFocus]);
  const activeKey = activeCohorts.map(({ id }) => id).join("|");
  useAutoTour("learn", activeCohorts.length > 0);
  return (
    <TabScreen
      right="updates"
      bleedTop
      contentInsetAdjustmentBehavior="never"
      overlay={
        activeCohorts.length > 1 ? (
          <CohortPageDots
            count={activeCohorts.length}
            position={pagePosition}
          />
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
      {activeCohorts.length > 0 ? (
        <FullBleed>
          <CohortCarousel
            // Remounts when a class moves to or from Diarsipkan, starting
            // again from the saved card.
            key={`${activeOrganizationId}:${activeKey}`}
            cohorts={activeCohorts}
            eventsByCohort={eventsByCohort}
            eventsError={dashboard.error}
            eventsPending={dashboard.isPending}
            milestonesByCohort={milestonesByCohort}
            now={now}
            onArchive={onArchive}
            onBadgeClaimed={openArchive}
            onMissingFocus={onMissingFocus}
            onRetryEvents={() => void dashboard.refetch()}
            organizationId={activeOrganizationId!}
            outlines={outlines}
            pagePosition={pagePosition}
            userId={session!.user.id}
          />
        </FullBleed>
      ) : archivedClasses.length > 0 ? (
        // Without a card the page still starts below the transparent header.
        <View style={{ paddingTop: insets.top + 56 }}>
          <Empty>
            Semua kelas sudah selesai. Kelas yang selesai atau kamu arsipkan ada
            di Diarsipkan di bawah.
          </Empty>
        </View>
      ) : dashboard.data && !dashboard.error ? (
        <View style={{ paddingTop: insets.top + 56 }}>
          <Empty>
            Belum ada kelas di organisasi ini. Kelas muncul di sini setelah
            lembaga mendaftarkan kamu. Sementara itu, lanjutkan latihan Hangeul
            dan kosakata dari tab Hari Ini.
          </Empty>
        </View>
      ) : null}
      <ArchivedClasses
        items={archivedClasses}
        open={archiveOpen || activeCohorts.length === 0}
        onToggle={() => setArchiveOpen((open) => !open)}
        onRestore={(item) =>
          restoreCourse(
            item.cohort.course.id,
            archiveStates.get(item.cohort.id),
          )
        }
      />
      {/* This tab draws under the tab bar (no automatic insets), so the end
          of the page keeps clear of it, and of the page dots above it. */}
      <SafeAreaView
        edges={{ bottom: true }}
        pointerEvents="none"
        style={styles.bottomSpacer}
      >
        <View style={{ height: activeCohorts.length > 1 ? 56 : 8 }} />
      </SafeAreaView>
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
  bottomSpacer: { flex: 0 },
  dotsPill: {
    marginBottom: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
});
