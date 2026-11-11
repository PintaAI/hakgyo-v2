import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { PracticeHub } from "../../../../src/components/practice-hub";
import { TabScreen } from "../../../../src/components/tab-screen";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSync } from "../../../../src/providers/MobileSyncProvider";
import { usePushNotifications } from "../../../../src/providers/PushNotificationsProvider";
import { useSyncIndex } from "../../../../src/sync/hooks";
import { useAutoTour } from "../../../../src/tour/tour-provider";
import { useOpenEventMediaPrefetch } from "../../../../src/components/assessment-media";
import { isHangeulMastered } from "../../../../src/lib/hangeul-visibility";
import { useHangeulArchived } from "../../../../src/lib/use-cohort-archive";
import { useUserRefresh } from "../../../../src/lib/use-user-refresh";

export default function PracticeTab() {
  const { activeOrganizationId } = useAppTheme();
  const dashboard = useSyncIndex(activeOrganizationId);
  const hangeulArchived = useHangeulArchived(isHangeulMastered(dashboard.data));
  useAutoTour("practice", Boolean(dashboard.data));
  const { syncNow } = useMobileSync();
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
  const pullRefresh = useUserRefresh(() =>
    syncNow(activeOrganizationId ?? undefined),
  );
  return (
    <TabScreen
      title="Latihan"
      titleIcon={{ symbol: "pencil.and.list.clipboard" }}
      // Spins for the learner's own pull only, not background syncs.
      refreshing={pullRefresh.refreshing}
      onRefresh={pullRefresh.onRefresh}
    >
      <PracticeHub
        coursesError={dashboard.error}
        coursesPending={dashboard.isPending}
        hangeulHidden={hangeulArchived}
        onRetryCourses={() => void dashboard.refetch()}
      />
    </TabScreen>
  );
}
