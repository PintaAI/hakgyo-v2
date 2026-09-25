import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Network from "expo-network";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef } from "react";
import { AppState, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { authClient } from "../src/lib/auth-client";
import { api, TRPCProvider } from "../src/lib/trpc";
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
  useMobileSyncActions,
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
  const { cacheDashboard } = useMobileSyncActions();
  const { checkForUpdates, pendingCount } = useMobileSync();
  const automaticSyncRef = useRef({
    scope: "",
    nextAttemptAt: 0,
    failures: 0,
    running: false,
  });
  const dashboard = api.mobileSync.getDashboard.useQuery(
    activeOrganizationId ? { organizationId: activeOrganizationId } : undefined,
    { enabled: Boolean(session && isHydrated), retry: false },
  );

  useEffect(() => {
    if (!isPending && isHydrated) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isHydrated, isPending]);

  useEffect(() => {
    if (dashboard.data) cacheDashboard(dashboard.data);
  }, [cacheDashboard, dashboard.data]);

  useEffect(() => {
    if (!session || !isHydrated) return;
    const scope = `${session.user.id}:${activeOrganizationId ?? "all"}`;
    if (automaticSyncRef.current.scope !== scope) {
      automaticSyncRef.current = {
        scope,
        nextAttemptAt: Date.now() + Math.random() * 5000,
        failures: 0,
        running: false,
      };
    }
    const state = automaticSyncRef.current;
    let active = true;
    const attempt = () => {
      if (!active || AppState.currentState !== "active" || state.running)
        return;
      if (dashboard.isFetching && !dashboard.data && pendingCount === 0) return;
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
            state.nextAttemptAt =
              Date.now() + 15 * 60_000 + Math.random() * 60_000;
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
    dashboard.data,
    dashboard.isFetching,
    isHydrated,
    pendingCount,
    session,
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
