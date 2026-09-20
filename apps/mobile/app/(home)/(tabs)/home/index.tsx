import { router, Stack, type Href } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { api } from "../../../../src/lib/trpc";
import { useDrawer } from "../../../../src/providers/DrawerProvider";
import { toolbarIcons } from "../../../../src/theme/toolbar-icons";
import { StudyScreen } from "../../../../src/components/learning-ui";
import { WeeklyStreak } from "../../../../src/components/weekly-streak";
import { authClient } from "../../../../src/lib/auth-client";
import { TodayVocabularyPractice } from "../../../../src/components/today-vocabulary-practice";
import { TodayAssessmentPractice } from "../../../../src/components/today-assessment-practice";
import { OrganizationSwitcherTrigger } from "../../../../src/components/organization-switcher";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";

export default function HomeTab() {
  const { open } = useDrawer();
  const { data: session } = authClient.useSession();
  const { activeOrganizationId } = useAppTheme();
  const utils = api.useUtils();
  const [refreshing, setRefreshing] = useState(false);
  const [scrollGesture] = useState(() => Gesture.Native());

  const openOrganizationSwitcher = () =>
    router.push("/organization-switcher" as Href);

  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        utils.practice.invalidate(),
        utils.gamification.invalidate(),
      ]);
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
        <WeeklyStreak />
        {session && activeOrganizationId ? (
          <TodayVocabularyPractice
            key={`${session.user.id}:${activeOrganizationId}`}
            organizationId={activeOrganizationId}
            scrollGesture={scrollGesture}
          />
        ) : null}
        {activeOrganizationId ? (
          <TodayAssessmentPractice
            key={activeOrganizationId}
            organizationId={activeOrganizationId}
          />
        ) : null}
      </StudyScreen>
    </>
  );
}
