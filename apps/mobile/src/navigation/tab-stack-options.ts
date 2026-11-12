import { Platform } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";

/**
 * Stack screen options shared by the tab roots: a transparent native header on
 * iOS and no header on Android. iOS 26+ draws the Liquid Glass header and the
 * scroll edge effect under it; older iOS versions keep the transparent header.
 *
 * The top edge effect is UIKit's `automatic` style, not `soft`: on iOS 27 an
 * app linked against the iOS 26 SDK draws an explicit `soft` edge over the
 * status bar only, while `automatic` (hard on iOS 27, soft on iOS 26) runs
 * through the whole header (react-native-screens#4776). There is no
 * `headerBlurEffect` because it overlaps `scrollEdgeEffects` (per the Expo
 * docs), and no native large title because each screen renders its own
 * in-content title.
 *
 * Every tab takes these options, so their headers frost alike. The edge effect
 * lands on the scroll view react-native-screens finds by following first
 * subviews, so `TabScreen`'s scroll view must be the screen's first native
 * view. Only Belajar overrides `scrollEdgeEffects`, because its class card runs
 * under the header.
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
    scrollEdgeEffects: ios ? ({ top: "automatic" } as const) : undefined,
  };
}
