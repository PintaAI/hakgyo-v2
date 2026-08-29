import { Stack } from "expo-router";

import { useAppTheme } from "../../src/providers/AppThemeProvider";

export default function HomeLayout() {
  const { colors } = useAppTheme();

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
