import { Stack } from "expo-router";
import { Platform } from "react-native";

import { useAppTheme } from "../../../../src/providers/AppThemeProvider";

const detailOptions = Platform.select({
  ios: {
    presentation: "formSheet" as const,
    headerLargeTitle: false,
    headerTransparent: true,
    sheetAllowedDetents: "fitToContents" as const,
    sheetExpandsWhenScrolledToEdge: false,
    sheetGrabberVisible: true,
  },
  default: {
    presentation: "formSheet" as const,
    headerLargeTitle: false,
    headerTransparent: false,
    sheetAllowedDetents: [0.55, 0.9] as [number, number],
    sheetInitialDetentIndex: 0,
    sheetCornerRadius: 28,
    sheetElevation: 24,
    sheetShouldOverflowTopInset: false,
    sheetLargestUndimmedDetentIndex: "none" as const,
  },
});

export default function ProfileTabLayout() {
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
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="account" options={detailOptions} />
    </Stack>
  );
}
