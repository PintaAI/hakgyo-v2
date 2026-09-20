import { type Href, Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, ScrollView } from "react-native";
import { api } from "../../../../src/lib/trpc";
import { StudyScreen } from "../../../../src/components/learning-ui";
import { PracticeHub } from "../../../../src/components/practice-hub";
import { OrganizationSwitcherTrigger } from "../../../../src/components/organization-switcher";
import { isStaleClosedOnDemandAssessment } from "../../../../src/lib/assessment-state";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useDrawer } from "../../../../src/providers/DrawerProvider";
import { toolbarIcons } from "../../../../src/theme/toolbar-icons";

export default function PracticeTab() {
  const { open } = useDrawer();
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
  const preselectedSourceCourseItemId = firstParam(
    incoming.sourceCourseItemId,
  );
  const preselectedSource =
    preselectedCourseId && preselectedSourceCourseItemId
      ? {
          courseId: preselectedCourseId,
          sourceCourseItemId: preselectedSourceCourseItemId,
          vocabularySetId: firstParam(incoming.vocabularySetId) || undefined,
          title: firstParam(incoming.vocabularyTitle) || undefined,
        }
      : undefined;
  const organizationScope = {
    organizationId: activeOrganizationId ?? undefined,
  };
  const queryOptions = { enabled: Boolean(activeOrganizationId) };
  const courses = api.learning.listMyCourses.useQuery(
    organizationScope,
    queryOptions,
  );
  const events = api.assessmentEvent.listForLearner.useQuery(
    organizationScope,
    queryOptions,
  );
  const utils = api.useUtils();
  const [now, setNow] = useState(Date.now);
  const scrollViewRef = useRef<ScrollView>(null);

  const focusResources = useCallback((offsetY: number) => {
    scrollViewRef.current?.scrollTo({
      animated: true,
      y: Math.max(0, offsetY - 12),
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const visibleEvents = (events.data ?? []).filter(
    (event) => !isStaleClosedOnDemandAssessment(event, now),
  );
  const actionableEvents = visibleEvents.filter((event) => {
    const attempt = event.attempts[0];
    return !attempt || attempt.status === "IN_PROGRESS";
  });
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.menu}
          accessibilityLabel="Open menu"
          onPress={open}
        />
      </Stack.Toolbar>
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
        title="Practice"
        keyboardAvoiding
        automaticallyAdjustKeyboardInsets
        scrollViewRef={scrollViewRef}
        refreshing={courses.isRefetching || events.isRefetching}
        onRefresh={() => {
          void utils.learning.invalidate();
          void utils.assessmentEvent.invalidate();
        }}
      >
        {Platform.OS !== "ios" ? (
          <OrganizationSwitcherTrigger
            onPress={() => router.push("/organization-switcher" as Href)}
          />
        ) : null}
        <PracticeHub
          courses={courses.data ?? []}
          coursesError={courses.error}
          coursesPending={courses.isPending}
          events={actionableEvents}
          eventsError={events.error}
          eventsPending={events.isPending}
          now={now}
          onResourceFocus={focusResources}
          onRetryCourses={() => void courses.refetch()}
          onRetryEvents={() => void events.refetch()}
          preselectedSource={preselectedSource}
        />
      </StudyScreen>
    </>
  );
}
