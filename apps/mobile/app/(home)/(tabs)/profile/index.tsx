import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as Updates from "expo-updates";
import { useUpdates } from "expo-updates";
import { useState } from "react";
import { Alert, Linking, Text } from "react-native";

import { AppSegmentedControl } from "../../../../src/components/app-segmented-control";
import { DoodleBackground } from "../../../../src/components/doodle-background";
import { StudyScreen } from "../../../../src/components/learning-ui";
import {
  MilestoneTrail,
  ProfileHero,
  RecentActivity,
} from "../../../../src/components/profile-learner";
import {
  SettingsRow,
  SettingsSection,
} from "../../../../src/components/settings-ui";
import { WeeklyStreak } from "../../../../src/components/weekly-streak";
import { authClient } from "../../../../src/lib/auth-client";
import { api } from "../../../../src/lib/trpc";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSync } from "../../../../src/providers/MobileSyncProvider";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const UPDATE_CHANNEL = Updates.channel ?? "unpublished";
const CURRENT_UPDATE_ID = Updates.updateId ?? null;

export default function ProfileTab() {
  const queryClient = useQueryClient();
  const { data: session, refetch: refetchSession } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const { isUpdatePending } = useUpdates();
  const [segment, setSegment] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const {
    activeBrand,
    activeOrganizationId,
    isRefreshingOrganizations,
    refreshOrganizations,
  } = useAppTheme();
  const { isSyncing, pendingCount, syncNow, clearLocalDataAndResync } =
    useMobileSync();
  const [isResetting, setIsResetting] = useState(false);
  const progress = api.gamification.getMySummary.useQuery();
  const displayName = session?.user.name || "Hakgyo learner";
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  const handleCheckForUpdates = async () => {
    if (isCheckingUpdates) return;
    setIsCheckingUpdates(true);

    try {
      if (__DEV__ || !Updates.isEnabled) {
        Alert.alert(
          "Updates",
          "Over-the-air updates only work in standalone builds. You are running in development mode.",
        );
        return;
      }
      if (isUpdatePending) {
        Alert.alert(
          "Update ready",
          "A downloaded update is waiting. Restart now to apply it?",
          [
            { text: "Later", style: "cancel" },
            {
              text: "Restart",
              onPress: () => void Updates.reloadAsync(),
            },
          ],
        );
        return;
      }
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert(
          "Up to date",
          `You are on the latest ${UPDATE_CHANNEL} update (v${APP_VERSION}).`,
        );
        return;
      }
      Alert.alert(
        "Update available",
        "Download it and restart the app now?",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Download & restart",
            onPress: () =>
              void (async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch (cause) {
                  Alert.alert(
                    "Update failed",
                    cause instanceof Error
                      ? cause.message
                      : "Could not download the update.",
                  );
                }
              })(),
          },
        ],
      );
    } catch (cause) {
      Alert.alert(
        "Update check failed",
        cause instanceof Error ? cause.message : "Could not check for updates.",
      );
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    setIsSigningOut(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setError(result.error.message || "Unable to sign out.");
        return;
      }

      await queryClient.cancelQueries();
      queryClient.clear();
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <DoodleBackground />
      <StudyScreen
        title=""
        onRefresh={() => {
          void syncNow(activeOrganizationId ?? undefined);
          void refreshOrganizations();
        }}
        refreshing={isSyncing || isRefreshingOrganizations}
      >
      <Text
        accessibilityRole="header"
        className="text-[26px] font-black leading-8 tracking-tight text-foreground"
      >
        Profil
      </Text>
      <AppSegmentedControl
        values={["Profile", "Settings"]}
        selectedIndex={segment}
        onIndexChange={setSegment}
      />

      {segment === 0 ? (
        <>
          <ProfileHero
            displayName={displayName}
            initials={initials}
            image={session?.user.image}
            email={session?.user.email ?? "Not signed in"}
            stats={progress.data?.profileStats}
            isPending={progress.isPending}
          />
          <WeeklyStreak />
          <MilestoneTrail
            achievements={progress.data?.achievements}
            isPending={progress.isPending}
            error={progress.error}
            onRetry={() => void progress.refetch()}
          />
          <RecentActivity
            activities={progress.data?.recentActivity ?? []}
            weekXp={progress.data?.weeklyActivity.xp ?? 0}
          />
        </>
      ) : (
        <>
          <SettingsSection title="Account">
            <SettingsRow
              label="Account details"
              detail={session?.user.email ?? "Not signed in"}
              symbol="person.crop.circle"
              fallback="?"
              onPress={() => router.push("/(home)/(tabs)/profile/account")}
            />
            <SettingsRow
              label="Sign out"
              symbol="arrow.right"
              fallback="→"
              destructive
              onPress={() => void handleSignOut()}
            />
          </SettingsSection>

          <SettingsSection title="Appearance">
            <SettingsRow
              label="Organization"
              detail={activeBrand.name}
              symbol="square.grid.2x2"
              fallback="#"
              onPress={() => router.push("/organization-switcher")}
            />
          </SettingsSection>

          <SettingsSection title="Notifications">
            <SettingsRow
              label="Reminders and alerts"
              detail="System settings"
              symbol="speaker.fill"
              fallback="♪"
              onPress={() => void Linking.openSettings()}
            />
          </SettingsSection>

          <SettingsSection title="Updates">
            <SettingsRow
              label="Sync learning progress"
              detail={
                isSyncing
                  ? "Syncing…"
                  : pendingCount
                    ? `${pendingCount} checkpoint${pendingCount === 1 ? "" : "s"} waiting`
                    : "Up to date on this device"
              }
              symbol="arrow.triangle.2.circlepath"
              fallback="↻"
              onPress={() => void syncNow(activeOrganizationId ?? undefined)}
            />
            <SettingsRow
              label="Check for updates"
              detail={
                isCheckingUpdates
                  ? "Checking…"
                  : isUpdatePending
                    ? "Restart to apply"
                    : `v${APP_VERSION}`
              }
              symbol="checkmark"
              fallback="✓"
              onPress={() => void handleCheckForUpdates()}
            />
            <SettingsRow
              label={`App version ${APP_VERSION}`}
              detail={
                CURRENT_UPDATE_ID
                  ? `${UPDATE_CHANNEL} · ${CURRENT_UPDATE_ID.slice(0, 8)}`
                  : UPDATE_CHANNEL
              }
              symbol="list.bullet"
              fallback="i"
              onPress={() =>
                Alert.alert(
                  "App version",
                  CURRENT_UPDATE_ID
                    ? `v${APP_VERSION} (${UPDATE_CHANNEL})\nUpdate: ${CURRENT_UPDATE_ID}`
                    : `v${APP_VERSION} (${UPDATE_CHANNEL})\nEmbedded build, no OTA update applied yet.`,
                )
              }
            />
          </SettingsSection>

          {__DEV__ ? (
            <SettingsSection title="Development">
              <SettingsRow
                label="Clear local data & resync"
                detail={
                  isResetting
                    ? "Clearing and syncing…"
                    : "Refresh cached learning data and images"
                }
                symbol="arrow.clockwise"
                fallback="↻"
                onPress={() => {
                  if (isResetting || isSyncing) return;
                  Alert.alert(
                    "Clear local data?",
                    "Pending progress will sync first. Local cached learning data and images will then be downloaded again.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Clear & resync",
                        onPress: () => {
                          setIsResetting(true);
                          void clearLocalDataAndResync(
                            activeOrganizationId ?? undefined,
                          )
                            .then(async () => {
                              await Promise.all([
                                refreshOrganizations(),
                                progress.refetch(),
                                refetchSession(),
                              ]);
                              Alert.alert(
                                "Resync complete",
                                "Local data has been refreshed.",
                              );
                            })
                            .catch((cause: unknown) => {
                              Alert.alert(
                                "Unable to resync",
                                cause instanceof Error
                                  ? cause.message
                                  : "Please try again online.",
                              );
                            })
                            .finally(() => setIsResetting(false));
                        },
                      },
                    ],
                  );
                }}
              />
            </SettingsSection>
          ) : null}

          <SettingsSection title="Support">
            <SettingsRow
              label="Send feedback"
              symbol="paperplane.fill"
              fallback="✈"
              onPress={() =>
                Alert.alert(
                  "Support",
                  "A support contact is not configured yet. Please reach out to your organization administrator.",
                )
              }
            />
          </SettingsSection>

          {(error ?? isSigningOut) ? (
            <Text
              accessibilityLiveRegion="polite"
              className="text-center text-sm font-semibold text-muted-foreground"
            >
              {error ?? "Signing out…"}
            </Text>
          ) : null}
        </>
      )}
      </StudyScreen>
    </>
  );
}
