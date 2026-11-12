import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { HomeSkeleton } from "../../../../src/components/home-skeleton";
import { Avatar, QueryState } from "../../../../src/components/learning-ui";
import { TabScreen } from "../../../../src/components/tab-screen";
import { TodayAgenda } from "../../../../src/components/today-agenda";
import { WeeklyStreak } from "../../../../src/components/weekly-streak";
import { authClient } from "../../../../src/lib/auth-client";
import { TodayVocabularyPractice } from "../../../../src/components/today-vocabulary-practice";
import { TodayAssessmentPractice } from "../../../../src/components/today-assessment-practice";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSyncActions } from "../../../../src/providers/MobileSyncProvider";
import { useSyncIndex } from "../../../../src/sync/hooks";
import { useAutoTour } from "../../../../src/tour/tour-provider";
import { TourTarget } from "../../../../src/tour/tour-target";

export default function HomeTab() {
  const { data: session } = authClient.useSession();
  const { activeOrganizationId } = useAppTheme();
  const { syncNow } = useMobileSyncActions();
  // Local learner index (streak, today's practice pools); synced by the engine.
  const dashboard = useSyncIndex(session ? activeOrganizationId : undefined);
  const [refreshing, setRefreshing] = useState(false);
  useAutoTour("home", Boolean(dashboard.data));
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
      {dashboard.data ? null : dashboard.error ? (
        <QueryState
          pending={false}
          error={dashboard.error}
          retry={() => void dashboard.refetch()}
        />
      ) : (
        <HomeSkeleton pending={dashboard.isPending} />
      )}
      {dashboard.data ? (
        <>
          <TourTarget id="home.streak">
            <WeeklyStreak summary={dashboard.data.gamification} />
          </TourTarget>
          {/* Meetings and class assessments coming up, one tap away. */}
          <TodayAgenda index={dashboard.data} />
          {session && activeOrganizationId ? (
            <TourTarget id="home.vocabulary">
              <TodayVocabularyPractice
                key={`${session.user.id}:${activeOrganizationId}`}
                organizationId={activeOrganizationId}
                pool={dashboard.data.practice.vocabulary}
                scrollGesture={scrollGesture}
              />
            </TourTarget>
          ) : null}
          {activeOrganizationId ? (
            <TourTarget id="home.challenge">
              <TodayAssessmentPractice
                key={activeOrganizationId}
                organizationId={activeOrganizationId}
                pool={dashboard.data.practice.assessment}
              />
            </TourTarget>
          ) : null}
        </>
      ) : null}
    </TabScreen>
  );
}
