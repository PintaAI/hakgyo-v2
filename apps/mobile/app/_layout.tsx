import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { authClient } from "../src/lib/auth-client";
import { TRPCProvider } from "../src/lib/trpc";
import {
  AppThemeProvider,
  useAppTheme,
} from "../src/providers/AppThemeProvider";
import { DrawerProvider } from "../src/providers/DrawerProvider";
import "../global.css";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { data: session, isPending } = authClient.useSession();
  const { colorScheme, colors, isHydrated } = useAppTheme();

  useEffect(() => {
    if (!isPending && isHydrated) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isHydrated, isPending]);

  if (isPending || !isHydrated) return null;

  const baseNavigationTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const navigationTheme = {
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
              <Stack.Screen name="(home)" />
              <Stack.Screen name="events/[eventId]" />
              <Stack.Screen name="vocabulary/[vocabularySetId]" />
              <Stack.Screen
                name="courses/[courseId]/items/[courseItemId]"
                options={{ headerShown: true }}
              />
              <Stack.Screen
                name="courses/[courseId]/items/[courseItemId]/attempts/[attemptId]"
                options={{ headerShown: true }}
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
          <AppThemeProvider>
            <RootNavigator />
          </AppThemeProvider>
        </TRPCProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
