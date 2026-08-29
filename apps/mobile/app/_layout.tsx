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
  const { colorScheme, colors } = useAppTheme();

  useEffect(() => {
    if (!isPending) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isPending]);

  if (isPending) return null;

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
            <Stack.Screen name="courses/[courseId]" />

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
        <AppThemeProvider>
          <TRPCProvider>
            <RootNavigator />
          </TRPCProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
