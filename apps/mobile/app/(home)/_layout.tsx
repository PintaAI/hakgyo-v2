import { Stack } from "expo-router";
import { useEffect } from "react";

import { markSignedInBefore } from "../../src/lib/onboarding";
import { useSubmitHangeulPlacement } from "../../src/lib/use-hangeul-placement";
import { useAppTheme } from "../../src/providers/AppThemeProvider";

export default function HomeLayout() {
  const { colors } = useAppTheme();
  useSubmitHangeulPlacement();
  // Only signed-in sessions reach this layout.
  useEffect(() => {
    markSignedInBefore();
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerLargeTitle: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
