import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { PracticeHub } from "../../../../src/components/practice-hub";
import { TabScreen } from "../../../../src/components/tab-screen";
import { isStaleClosedOnDemandAssessment } from "../../../../src/lib/assessment-state";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSync } from "../../../../src/providers/MobileSyncProvider";
import { usePushNotifications } from "../../../../src/providers/PushNotificationsProvider";
import { useCourseOutlines, useSyncIndex } from "../../../../src/sync/hooks";
import { useOpenEventMediaPrefetch } from "../../../../src/components/assessment-media";
import { firstParam } from "../../../../src/lib/route-params";

export default function PracticeTab() {
  const { activeOrganizationId } = useAppTheme();
  const incoming = useLocalSearchParams<{
    courseId?: string | string[];
    sourceCourseItemId?: string | string[];
    vocabularySetId?: string | string[];
    vocabularyTitle?: string | string[];
  }>();
  const preselectedCourseId = firstParam(incoming.courseId);
  const preselectedSourceCourseItemId = firstParam(incoming.sourceCourseItemId);
  const preselectedSource =
    preselectedCourseId && preselectedSourceCourseItemId
      ? {
          courseId: preselectedCourseId,
          sourceCourseItemId: preselectedSourceCourseItemId,
          vocabularySetId: firstParam(incoming.vocabularySetId) || undefined,
          title: firstParam(incoming.vocabularyTitle) || undefined,
        }
      : undefined;
  const dashboard = useSyncIndex(activeOrganizationId);
  const courseIds = useMemo(
    () => (dashboard.data?.courses ?? []).map((course) => course.id),
    [dashboard.data?.courses],
  );
  // Composed per course from the local bundles (learner view).
  const { outlines } = useCourseOutlines(courseIds);
  const { isSyncing, syncNow } = useMobileSync();
  const [now, setNow] = useState(Date.now);
  const scrollViewRef = useRef<ScrollView>(null);
  const { promptInContext } = usePushNotifications();

  // Tryouts open without warning, so this is where notifications pay off.
  // Delay past the tab transition; shown at most once per install.
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(promptInContext, 800);
      return () => clearTimeout(timer);
    }, [promptInContext]),
  );

  const focusResources = useCallback((offsetY: number) => {
    scrollViewRef.current?.scrollTo({
      animated: true,
      y: Math.max(0, offsetY - 12),
    });
  }, []);

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

  useOpenEventMediaPrefetch(dashboard.data?.events);
  const visibleEvents = (dashboard.data?.events ?? []).filter(
    (event) => !isStaleClosedOnDemandAssessment(event, now),
  );
  const actionableEvents = visibleEvents.filter((event) => {
    const attempt = event.attempts[0];
    return !attempt || attempt.status === "IN_PROGRESS";
  });
  return (
    <TabScreen
      title="Latihan"
      titleIcon={{ symbol: "pencil.and.list.clipboard" }}
      keyboardAvoiding
      automaticallyAdjustKeyboardInsets
      scrollViewRef={scrollViewRef}
      refreshing={dashboard.isRefetching || isSyncing}
      onRefresh={() => {
        void syncNow(activeOrganizationId ?? undefined);
      }}
    >
      <PracticeHub
        courses={dashboard.data?.courses ?? []}
        coursesError={dashboard.error}
        coursesPending={dashboard.isPending}
        events={actionableEvents}
        eventsError={dashboard.error}
        eventsPending={dashboard.isPending}
        now={now}
        outlines={outlines}
        onResourceFocus={focusResources}
        onRetryCourses={() => void dashboard.refetch()}
        onRetryEvents={() => void dashboard.refetch()}
        preselectedSource={preselectedSource}
      />
    </TabScreen>
  );
}
