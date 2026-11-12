import { Stack, ThemeProvider, useTheme } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";

import { DoodleBackground } from "../../../../src/components/doodle-background";
import { useTabStackScreenOptions } from "../../../../src/navigation/tab-stack-options";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";

export default function HomeTabLayout() {
  const screenOptions = useTabStackScreenOptions();
  const { colors } = useAppTheme();
  const navigationTheme = useTheme();
  // The native stack paints its container and every screen with the
  // navigation theme's background, which would cover the doodles. Within this
  // stack only, that background is transparent; the View below paints it.
  const transparentTheme = useMemo(
    () => ({
      ...navigationTheme,
      colors: { ...navigationTheme.colors, background: "transparent" },
    }),
    [navigationTheme],
  );

  // The doodles sit behind the stack, not inside the screen: react-native-screens
  // applies `scrollEdgeEffects` (and the repeated-tab scroll to top) to the
  // scroll view it finds by following each first subview down from the screen.
  // A background drawn as the screen's first child ends that walk at the
  // doodle, so the tab options would never reach Hari Ini's scroll view.
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DoodleBackground />
      <ThemeProvider value={transparentTheme}>
        <Stack
          screenOptions={{
            ...screenOptions,
            contentStyle: { backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen name="index" options={{ title: "Hari Ini" }} />
        </Stack>
      </ThemeProvider>
    </View>
  );
}
