import { router, Stack, type Href } from "expo-router";
import { Image } from "expo-image";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { DoodleBackground } from "../../../../src/components/doodle-background";
import { SidebarToolbarButton } from "../../../../src/components/sidebar/SidebarToolbarButton";
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
  const { data: session } = authClient.useSession();
  const { activeOrganizationId } = useAppTheme();
  const { syncNow } = useMobileSyncActions();
  const dashboard = api.mobileSync.getDashboard.useQuery(
    activeOrganizationId ? { organizationId: activeOrganizationId } : undefined,
    { enabled: Boolean(session && activeOrganizationId), retry: false },
  );
  const [refreshing, setRefreshing] = useState(false);
  const [scrollGesture] = useState(() => Gesture.Native());

  const displayName = session?.user.name || "Hakgyo learner";
  const nameInitial = displayName.trim()[0]?.toUpperCase() ?? "H";
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
      <DoodleBackground />
      <SidebarToolbarButton />
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
        title=""
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
          <View className="size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary">
            {session?.user.image ? (
              <Image
                cachePolicy="memory-disk"
                className="size-full"
                contentFit="cover"
                source={{ uri: session.user.image }}
                style={{ width: 24, height: 24 }}
                transition={0}
              />
            ) : (
              <Text className="text-xs font-bold text-primary-foreground">
                {nameInitial}
              </Text>
            )}
          </View>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open profile"
            accessibilityHint="Opens your profile tab"
            className="min-w-0 flex-1 active:opacity-60"
            onPress={() => router.navigate("/(home)/(tabs)/profile")}
          >
            <Text
              className="text-muted-foreground text-xl leading-7 tracking-tight underline"
              numberOfLines={1}
            >
              {displayName}
            </Text>
          </Pressable>
        </View>
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
