import { Stack } from "expo-router";
import { Platform } from "react-native";

import { useAppTheme } from "../../../../src/providers/AppThemeProvider";

export default function AssessmentsTabLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        // iOS 26+ supplies the native Liquid Glass header; older iOS versions
        // progressively ignore scrollEdgeEffects and keep the same fallback.
        headerShown: Platform.OS === "ios",
        headerStyle: {
          backgroundColor:
            Platform.OS === "ios" ? "transparent" : colors.background,
        },
        headerTintColor: colors.foreground,
        headerLargeTitle: true,
        headerTransparent: Platform.OS === "ios",
        scrollEdgeEffects: Platform.OS === "ios" ? { top: "soft" } : undefined,
      }}
    />
  );
}
