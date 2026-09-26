import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Network from "expo-network";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef } from "react";
import { AppState, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { authClient } from "../src/lib/auth-client";
import { TRPCProvider } from "../src/lib/trpc";
import { ForcedUpdateGate } from "../src/components/forced-update-gate";
import { useSyncIndex } from "../src/sync/hooks";
import {
  AppThemeProvider,
  useAppTheme,
} from "../src/providers/AppThemeProvider";
import { DrawerProvider } from "../src/providers/DrawerProvider";
import { QuestionNavigatorProvider } from "../src/providers/QuestionNavigatorProvider";
import {
  TransitionOverrideProvider,
  useTransitionOverride,
} from "../src/navigation/screen-transition";
import {
  MobileSyncProvider,
  useMobileSync,
} from "../src/providers/MobileSyncProvider";
import "../global.css";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { data: session, isPending } = authClient.useSession();
  const {
    activeOrganizationId,
    colorScheme,
    colors,
    isHydrated,
    refreshOrganizations,
  } = useAppTheme();
  // "fade" for exactly one push after a drawer item tap (see
  // DrawerProvider.navigate); every other navigation uses the default slide.
  const { transition } = useTransitionOverride();
  const {
    checkForUpdates,
    getNextCheckAfterMs,
    pendingCount,
    upgradeRequired,
  } = useMobileSync();
  const automaticSyncRef = useRef({
    scope: "",
    nextAttemptAt: 0,
    failures: 0,
    running: false,
  });
  // The learner index is the local replacement for the old dashboard fetch:
  // the engine writes it after every sync and screens read it from SQLite.
  const index = useSyncIndex(session ? activeOrganizationId : undefined);
  const hasIndex = Boolean(index.data);
  const indexLoading = index.isPending && !hasIndex;

  useEffect(() => {
    if (!isPending && isHydrated) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isHydrated, isPending]);

  useEffect(() => {
    // An outdated client must not keep polling; the gate handles recovery.
    if (!session || !isHydrated || upgradeRequired) return;
    const scope = `${session.user.id}:${activeOrganizationId ?? "all"}`;
    if (automaticSyncRef.current.scope !== scope) {
      // With a local index and nothing to upload the app is usable offline,
      // so spread the automatic check over a minute to avoid a thundering
      // herd (e.g. many launches after an outage or a push). Without an
      // index, or with queued progress, sync promptly. User actions
      // (pull-to-refresh, completing content) sync immediately.
      const startupJitterMs = hasIndex && pendingCount === 0 ? 60_000 : 5_000;
      automaticSyncRef.current = {
        scope,
        nextAttemptAt: Date.now() + Math.random() * startupJitterMs,
        failures: 0,
        running: false,
      };
    }
    const state = automaticSyncRef.current;
    let active = true;
    const attempt = () => {
      if (!active || AppState.currentState !== "active" || state.running)
        return;
      if (indexLoading && pendingCount === 0) return;
      const now = Date.now();
      if (now < state.nextAttemptAt) return;
      state.running = true;
      state.nextAttemptAt = now + 15 * 60_000;
      const backOff = () => {
        state.failures = Math.min(state.failures + 1, 6);
        const base = Math.min(60 * 60_000, 15_000 * 2 ** state.failures);
        state.nextAttemptAt = Date.now() + base + Math.random() * base;
      };
      void checkForUpdates(activeOrganizationId ?? undefined)
        .then((result) => {
          if (!active) return;
          if (result.state === "queued") {
            backOff();
          } else {
            state.failures = 0;
            // The server can stretch the poll interval (manifest
            // `checkAfterMs`) to shed load; never poll more often than 15 min.
            const interval = Math.max(15 * 60_000, getNextCheckAfterMs() ?? 0);
            state.nextAttemptAt =
              Date.now() + interval + Math.random() * 60_000;
          }
        })
        .catch(() => {
          if (active) backOff();
        })
        .finally(() => {
          state.running = false;
        });
    };
    const timer = setInterval(attempt, 30_000);
    const startup = setTimeout(
      attempt,
      Math.max(0, state.nextAttemptAt - Date.now()),
    );
    const appSubscription = AppState.addEventListener("change", (next) => {
      if (next === "active") attempt();
    });
    let wasOffline = false;
    const networkSubscription = Network.addNetworkStateListener((next) => {
      const online =
        next.isConnected !== false && next.isInternetReachable !== false;
      if (online && wasOffline) {
        state.nextAttemptAt = Math.min(
          state.nextAttemptAt,
          Date.now() + Math.random() * 5000,
        );
        setTimeout(attempt, 5000);
      }
      wasOffline = !online;
    });
    return () => {
      active = false;
      clearTimeout(startup);
      clearInterval(timer);
      appSubscription.remove();
      networkSubscription.remove();
    };
  }, [
    activeOrganizationId,
    checkForUpdates,
    getNextCheckAfterMs,
    hasIndex,
    indexLoading,
    isHydrated,
    pendingCount,
    session,
    upgradeRequired,
  ]);

  const navigationTheme = useMemo(() => {
    const baseNavigationTheme =
      colorScheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...baseNavigationTheme,
      colors: {
        ...baseNavigationTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.foreground,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [colorScheme, colors]);

  if (isPending || !isHydrated) return null;

  if (upgradeRequired) {
    return (
      <>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <ThemeProvider value={navigationTheme}>
          <ForcedUpdateGate minProtocol={upgradeRequired.minProtocol} />
        </ThemeProvider>
      </>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <ThemeProvider value={navigationTheme}>
        <DrawerProvider enabled={Boolean(session)}>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: colors.background },
              headerShown: false,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.foreground,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="courses/[courseId]"
              options={{
                headerShown: false,
                ...Platform.select({
                  ios: {
                    presentation: "formSheet",
                    sheetAllowedDetents: [1],
                    sheetGrabberVisible: false,
                    sheetCornerRadius: 28,
                    sheetExpandsWhenScrolledToEdge: true,
                  },
                  default: {
                    presentation: "formSheet",
                    sheetAllowedDetents: [1],
                    sheetInitialDetentIndex: 0,
                    sheetCornerRadius: 28,
                    sheetElevation: 24,
                    sheetGrabberVisible: false,
                    sheetLargestUndimmedDetentIndex: "none",
                  },
                }),
              }}
            />

            <Stack.Protected guard={!session}>
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen
                name="auth"
                options={Platform.select({
                  ios: {
                    presentation: "formSheet",
                    headerLargeTitle: false,
                    headerTransparent: true,
                    sheetAllowedDetents: "fitToContents",
                    sheetExpandsWhenScrolledToEdge: false,
                    sheetGrabberVisible: true,
                  },
                  default: {
                    presentation: "formSheet",
                    headerLargeTitle: false,
                    headerTransparent: false,
                    sheetAllowedDetents: "fitToContents",
                    sheetInitialDetentIndex: 0,
                    sheetCornerRadius: 28,
                    sheetElevation: 24,
                    sheetShouldOverflowTopInset: false,
                    sheetLargestUndimmedDetentIndex: "none",
                    sheetResizeAnimationEnabled: true,
                  },
                })}
              />
            </Stack.Protected>

            <Stack.Protected guard={Boolean(session)}>
              <Stack.Screen
                name="assessment-questions"
                options={{
                  presentation: "formSheet",
                  headerShown: false,
                  sheetAllowedDetents: [0.55, 0.9],
                  sheetInitialDetentIndex: 0,
                  sheetCornerRadius: 28,
                  sheetGrabberVisible: true,
                  sheetExpandsWhenScrolledToEdge: true,
                  sheetLargestUndimmedDetentIndex: "none",
                }}
              />
              <Stack.Screen name="(home)" />
              <Stack.Screen
                name="organization-switcher"
                options={{
                  headerShown: Platform.OS === "ios",
                  headerBackVisible: false,
                  headerShadowVisible: false,
                  headerStyle: { backgroundColor: "transparent" },
                  title: "Choose organization",
                  contentStyle: { backgroundColor: "transparent" },
                  presentation: "formSheet",
                  sheetAllowedDetents: [0.55, 0.9],
                  sheetInitialDetentIndex: 0,
                  sheetCornerRadius: 28,
                  sheetElevation: 24,
                  sheetGrabberVisible: false,
                  sheetExpandsWhenScrolledToEdge: true,
                  sheetLargestUndimmedDetentIndex: "none",
                }}
                listeners={{
                  transitionEnd: (event) => {
                    if (!event.data.closing) void refreshOrganizations();
                  },
                }}
              />
              <Stack.Screen
                name="events/[eventId]"
                options={{ animation: transition }}
              />
              <Stack.Screen name="vocabulary/[vocabularySetId]" />
              <Stack.Screen
                name="vocabulary/[vocabularySetId]/items/[entryId]"
                options={Platform.select({
                  ios: {
                    presentation: "formSheet",
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    sheetAllowedDetents: [0.55, 0.9],
                    sheetInitialDetentIndex: 0,
                    sheetCornerRadius: 28,
                    sheetGrabberVisible: true,
                    sheetExpandsWhenScrolledToEdge: true,
                  },
                  default: {
                    presentation: "formSheet",
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    sheetAllowedDetents: [0.55, 0.9],
                    sheetInitialDetentIndex: 0,
                    sheetCornerRadius: 28,
                    sheetElevation: 24,
                    sheetGrabberVisible: true,
                    sheetExpandsWhenScrolledToEdge: true,
                    sheetLargestUndimmedDetentIndex: "none",
                  },
                })}
              />
              <Stack.Screen
                name="games/[gameKey]"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="courses/[courseId]/items/[courseItemId]"
                options={{
                  headerShown: true,
                  headerTitle: "",
                  animation: transition,
                }}
              />
              <Stack.Screen
                name="courses/[courseId]/items/[courseItemId]/learning-progress"
                options={Platform.select({
                  ios: {
                    presentation: "formSheet",
                    headerShown: false,
                    contentStyle: { backgroundColor: "transparent" },
                    sheetAllowedDetents: "fitToContents",
                    sheetExpandsWhenScrolledToEdge: false,
                    sheetGrabberVisible: false,
                  },
                  default: {
                    presentation: "formSheet",
                    headerShown: false,
                    contentStyle: { backgroundColor: "transparent" },
                    sheetAllowedDetents: "fitToContents",
                    sheetInitialDetentIndex: 0,
                    sheetCornerRadius: 28,
                    sheetElevation: 24,
                    sheetGrabberVisible: false,
                    sheetShouldOverflowTopInset: false,
                    sheetLargestUndimmedDetentIndex: "none",
                    sheetResizeAnimationEnabled: true,
                  },
                })}
              />
              <Stack.Screen
                name="courses/[courseId]/items/[courseItemId]/attempts/[attemptId]"
                options={{ headerShown: true, animation: transition }}
              />
            </Stack.Protected>
          </Stack>
        </DrawerProvider>
      </ThemeProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TRPCProvider>
          <MobileSyncProvider>
            <AppThemeProvider>
              <QuestionNavigatorProvider>
                <TransitionOverrideProvider>
                  <RootNavigator />
                </TransitionOverrideProvider>
              </QuestionNavigatorProvider>
            </AppThemeProvider>
          </MobileSyncProvider>
        </TRPCProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
