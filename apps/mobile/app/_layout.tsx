import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { Platform } from "react-native";
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
  useMobileSyncActions,
} from "../src/providers/MobileSyncProvider";
import "../global.css";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { data: session, isPending } = authClient.useSession();
  const { activeOrganizationId, colorScheme, colors, isHydrated } =
    useAppTheme();
  // "fade" for exactly one push after a drawer item tap (see
  // DrawerProvider.navigate); every other navigation uses the default slide.
  const { transition } = useTransitionOverride();
  const { cacheDashboard } = useMobileSyncActions();
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
                  headerShown: false,
                  presentation: "formSheet",
                  sheetAllowedDetents: [0.55, 0.9],
                  sheetInitialDetentIndex: 0,
                  sheetCornerRadius: 28,
                  sheetElevation: 24,
                  sheetGrabberVisible: true,
                  sheetExpandsWhenScrolledToEdge: true,
                  sheetLargestUndimmedDetentIndex: "none",
                }}
              />
              <Stack.Screen name="events/[eventId]" options={{ animation: transition }} />
              <Stack.Screen name="vocabulary/[vocabularySetId]" />
              <Stack.Screen
                name="games/[gameKey]"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="courses/[courseId]/items/[courseItemId]"
                options={{ headerShown: true, headerTitle: "", animation: transition }}
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
