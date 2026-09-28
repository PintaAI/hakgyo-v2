import { Platform } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";

/**
 * Stack screen options shared by the tab roots: a transparent native header on
 * iOS and no header on Android. iOS 26+ supplies the Liquid Glass header
 * through `scrollEdgeEffects`; older iOS versions ignore it and keep the same
 * fallback. There is no `headerBlurEffect` because it overlaps
 * `scrollEdgeEffects` (per the Expo docs), and no native large title because
 * each screen renders its own in-content title.
 */
export function useTabStackScreenOptions() {
  const { colors } = useAppTheme();
  const ios = Platform.OS === "ios";

  return {
    contentStyle: { backgroundColor: colors.background },
    headerShown: ios,
    headerStyle: {
      backgroundColor: ios ? "transparent" : colors.background,
    },
    headerTintColor: colors.foreground,
    headerLargeTitle: false,
    headerTransparent: ios,
    scrollEdgeEffects: ios ? ({ top: "soft" } as const) : undefined,
  };
}
