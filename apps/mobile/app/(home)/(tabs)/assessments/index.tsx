import {
  type Href,
  Stack,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, Text } from "react-native";
import { DoodleBackground } from "../../../../src/components/doodle-background";
import { StudyScreen } from "../../../../src/components/learning-ui";
import { PracticeHub } from "../../../../src/components/practice-hub";
import { OrganizationSwitcherTrigger } from "../../../../src/components/organization-switcher";
import { isStaleClosedOnDemandAssessment } from "../../../../src/lib/assessment-state";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSync } from "../../../../src/providers/MobileSyncProvider";
import { useCourseOutlines, useSyncIndex } from "../../../../src/sync/hooks";
import { SidebarToolbarButton } from "../../../../src/components/sidebar/SidebarToolbarButton";

export default function PracticeTab() {
  const { activeOrganizationId } = useAppTheme();
  const incoming = useLocalSearchParams<{
    courseId?: string | string[];
    sourceCourseItemId?: string | string[];
    vocabularySetId?: string | string[];
    vocabularyTitle?: string | string[];
  }>();
  const firstParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
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

  const visibleEvents = (dashboard.data?.events ?? []).filter(
    (event) => !isStaleClosedOnDemandAssessment(event, now),
  );
  const actionableEvents = visibleEvents.filter((event) => {
    const attempt = event.attempts[0];
    return !attempt || attempt.status === "IN_PROGRESS";
  });
  return (
    <>
      <DoodleBackground />
      <SidebarToolbarButton />
      {Platform.OS === "ios" ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.View hidesSharedBackground>
            <OrganizationSwitcherTrigger
              compact
              onPress={() => router.push("/organization-switcher" as Href)}
            />
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      ) : null}
      <StudyScreen
        title=""
        keyboardAvoiding
        automaticallyAdjustKeyboardInsets
        scrollViewRef={scrollViewRef}
        refreshing={dashboard.isRefetching || isSyncing}
        onRefresh={() => {
          void syncNow(activeOrganizationId ?? undefined);
        }}
      >
        <Text
          accessibilityRole="header"
          className="text-[26px] font-black leading-8 tracking-tight text-foreground"
        >
          Latihan
        </Text>
        {Platform.OS !== "ios" ? (
          <OrganizationSwitcherTrigger
            onPress={() => router.push("/organization-switcher" as Href)}
          />
        ) : null}
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
      </StudyScreen>
    </>
  );
}
