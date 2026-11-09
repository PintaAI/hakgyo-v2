import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { PracticeHub } from "../../../../src/components/practice-hub";
import { TabScreen } from "../../../../src/components/tab-screen";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSync } from "../../../../src/providers/MobileSyncProvider";
import { usePushNotifications } from "../../../../src/providers/PushNotificationsProvider";
import { useSyncIndex } from "../../../../src/sync/hooks";
import { useAutoTour } from "../../../../src/tour/tour-provider";
import { useOpenEventMediaPrefetch } from "../../../../src/components/assessment-media";
import { firstParam } from "../../../../src/lib/route-params";
import { isHangeulMastered } from "../../../../src/lib/hangeul-visibility";
import { useHangeulArchived } from "../../../../src/lib/use-cohort-archive";

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
  const hangeulArchived = useHangeulArchived(isHangeulMastered(dashboard.data));
  useAutoTour("practice", Boolean(dashboard.data));
  const { isSyncing, syncNow } = useMobileSync();
  const { promptInContext } = usePushNotifications();

  // Tryouts open without warning, so this is where notifications pay off.
  // Delay past the tab transition; shown at most once per install.
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(promptInContext, 800);
      return () => clearTimeout(timer);
    }, [promptInContext]),
  );

  // The source sheet opens these events; their media is warmed from here.
  useOpenEventMediaPrefetch(dashboard.data?.events);
  return (
    <TabScreen
      title="Latihan"
      titleIcon={{ symbol: "pencil.and.list.clipboard" }}
      refreshing={dashboard.isRefetching || isSyncing}
      onRefresh={() => {
        void syncNow(activeOrganizationId ?? undefined);
      }}
    >
      <PracticeHub
        coursesError={dashboard.error}
        coursesPending={dashboard.isPending}
        hangeulHidden={hangeulArchived}
        onRetryCourses={() => void dashboard.refetch()}
        preselectedSource={preselectedSource}
      />
    </TabScreen>
  );
}
