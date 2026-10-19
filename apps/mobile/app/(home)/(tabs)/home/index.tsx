import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { Avatar, QueryState } from "../../../../src/components/learning-ui";
import { TabScreen } from "../../../../src/components/tab-screen";
import { WeeklyStreak } from "../../../../src/components/weekly-streak";
import { authClient } from "../../../../src/lib/auth-client";
import { TodayVocabularyPractice } from "../../../../src/components/today-vocabulary-practice";
import { TodayAssessmentPractice } from "../../../../src/components/today-assessment-practice";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSyncActions } from "../../../../src/providers/MobileSyncProvider";
import { useSyncIndex } from "../../../../src/sync/hooks";

export default function HomeTab() {
  const { data: session } = authClient.useSession();
  const { activeOrganizationId } = useAppTheme();
  const { syncNow } = useMobileSyncActions();
  // Local learner index (streak, today's practice pools); synced by the engine.
  const dashboard = useSyncIndex(session ? activeOrganizationId : undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [scrollGesture] = useState(() => Gesture.Native());

  const displayName = session?.user.name || "Pelajar Hakgyo";
  const nameInitial = displayName.trim()[0]?.toUpperCase() ?? "H";

  async function refresh() {
    setRefreshing(true);
    try {
      await syncNow(activeOrganizationId ?? undefined);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <TabScreen
      doodle
      scrollGesture={scrollGesture}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      automaticallyAdjustKeyboardInsets
    >
      <View className="-mb-3 flex-row items-center gap-2">
        <Text
          accessibilityRole="header"
          className="shrink-0 text-[26px] font-black leading-8 tracking-tight text-foreground"
        >
          안녕하세요 ·
        </Text>
        <Avatar initials={nameInitial} size={24} uri={session?.user.image} />
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Buka profil"
          accessibilityHint="Membuka profil kamu"
          className="min-w-0 flex-1 active:opacity-60"
          onPress={() => router.push("/profile")}
        >
          <Text
            className="text-muted-foreground text-xl leading-7 tracking-tight underline"
            numberOfLines={1}
          >
            {displayName}
          </Text>
        </Pressable>
      </View>
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
    </TabScreen>
  );
}
