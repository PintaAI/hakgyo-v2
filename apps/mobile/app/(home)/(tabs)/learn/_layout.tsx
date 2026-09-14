import { Stack } from "expo-router";
import { Platform } from "react-native";

import { useAppTheme } from "../../../../src/providers/AppThemeProvider";

export default function LearnTabLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        // Transparent small header so the CohortCard thumbnail bleeds behind
        // the toolbar. No headerBlurEffect here: scrollEdgeEffects supplies
        // the iOS 26+ Liquid Glass blur (they overlap per Expo docs).
        headerShown: Platform.OS === "ios",
        headerLargeTitle: false,
        headerStyle: {
          backgroundColor:
            Platform.OS === "ios" ? "transparent" : colors.background,
        },
        headerTintColor: colors.foreground,
        headerTransparent: Platform.OS === "ios",
        headerShadowVisible: false,
        scrollEdgeEffects: Platform.OS === "ios" ? { top: "soft" } : undefined,
      }}
    >
      <Stack.Screen name="index" options={{ title: "" }} />
    </Stack>
  );
}
