import { router, Stack, type Href } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { useDrawer } from "../../../../src/providers/DrawerProvider";
import { toolbarIcons } from "../../../../src/theme/toolbar-icons";
import {
  QueryState,
  StudyScreen,
} from "../../../../src/components/learning-ui";
import { WeeklyStreak } from "../../../../src/components/weekly-streak";
import { authClient } from "../../../../src/lib/auth-client";
import { TodayVocabularyPractice } from "../../../../src/components/today-vocabulary-practice";
import { TodayAssessmentPractice } from "../../../../src/components/today-assessment-practice";
import { OrganizationSwitcherTrigger } from "../../../../src/components/organization-switcher";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSyncActions } from "../../../../src/providers/MobileSyncProvider";
import { api } from "../../../../src/lib/trpc";

export default function HomeTab() {
  const { open } = useDrawer();
  const { data: session } = authClient.useSession();
  const { activeOrganizationId } = useAppTheme();
  const { syncNow } = useMobileSyncActions();
  const dashboard = api.mobileSync.getDashboard.useQuery(
    activeOrganizationId ? { organizationId: activeOrganizationId } : undefined,
    { enabled: Boolean(session && activeOrganizationId), retry: false },
  );
  const [refreshing, setRefreshing] = useState(false);
  const [scrollGesture] = useState(() => Gesture.Native());

  const openOrganizationSwitcher = () =>
    router.push("/organization-switcher" as Href);

  async function refresh() {
    setRefreshing(true);
    try {
      await syncNow(activeOrganizationId ?? undefined);
    } finally {
      setRefreshing(false);
    }
  }

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
              onPress={openOrganizationSwitcher}
            />
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      ) : null}
      <StudyScreen
        title="Today"
        scrollGesture={scrollGesture}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        automaticallyAdjustKeyboardInsets
      >
        {Platform.OS !== "ios" ? (
          <OrganizationSwitcherTrigger onPress={openOrganizationSwitcher} />
        ) : null}
        <QueryState
          pending={dashboard.isPending}
          error={dashboard.error}
          retry={() => void dashboard.refetch()}
        />
        {dashboard.data ? (
          <>
            <WeeklyStreak summary={dashboard.data.gamification} />
            {session && activeOrganizationId ? (
              <TodayVocabularyPractice
                key={`${session.user.id}:${activeOrganizationId}`}
                organizationId={activeOrganizationId}
                pool={dashboard.data.practice.vocabulary}
                scrollGesture={scrollGesture}
              />
            ) : null}
            {activeOrganizationId ? (
              <TodayAssessmentPractice
                key={activeOrganizationId}
                organizationId={activeOrganizationId}
                pool={dashboard.data.practice.assessment}
              />
            ) : null}
          </>
        ) : null}
      </StudyScreen>
    </>
  );
}
