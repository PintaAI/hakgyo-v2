import { Stack } from "expo-router";
import { Platform } from "react-native";

import { formSheetOptions } from "../../src/navigation/sheet-options";
import { useAppTheme } from "../../src/providers/AppThemeProvider";

const detailOptions = formSheetOptions({
  detents: { ios: "fitToContents", android: [0.55, 0.9] },
  transparentHeader: true,
  systemCornerRadius: true,
});

/**
 * Profile and settings, presented as a page sheet from the sidebar and the
 * Home greeting. iOS keeps the transparent Liquid Glass header of the tabs;
 * Android shows an opaque header so the close button has a place.
 */
export default function ProfileLayout() {
  const { colors } = useAppTheme();
  const ios = Platform.OS === "ios";

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShown: true,
        headerStyle: {
          backgroundColor: ios ? "transparent" : colors.background,
        },
        headerTintColor: colors.foreground,
        headerLargeTitle: false,
        headerShadowVisible: false,
        headerTransparent: ios,
        scrollEdgeEffects: ios ? { top: "soft" } : undefined,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Profil" }} />
      <Stack.Screen name="account" options={detailOptions} />
    </Stack>
  );
}
