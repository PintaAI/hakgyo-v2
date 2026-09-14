import { Stack } from "expo-router";
import { useState } from "react";
import { api } from "../../../../src/lib/trpc";
import { useDrawer } from "../../../../src/providers/DrawerProvider";
import { toolbarIcons } from "../../../../src/theme/toolbar-icons";
import { StudyScreen } from "../../../../src/components/learning-ui";
import { WeeklyStreak } from "../../../../src/components/weekly-streak";
import { authClient } from "../../../../src/lib/auth-client";
import { TodayVocabularyPractice } from "../../../../src/components/today-vocabulary-practice";
import { TodayAssessmentPractice } from "../../../../src/components/today-assessment-practice";

export default function HomeTab() {
  const { open } = useDrawer();
  const { data: session } = authClient.useSession();
  const utils = api.useUtils();
  const [refreshing, setRefreshing] = useState(false);

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
      <StudyScreen
        title="Today"
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        automaticallyAdjustKeyboardInsets
      >
        <WeeklyStreak />
        {session ? (
          <TodayVocabularyPractice
            key={session.user.id}
            userId={session.user.id}
          />
        ) : null}
        <TodayAssessmentPractice />
      </StudyScreen>
    </>
  );
}
