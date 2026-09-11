import { Stack } from "expo-router";

import { useAppTheme } from "../../../../src/providers/AppThemeProvider";

export default function LearnTabLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShown: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Learn", headerShown: false }} />
    </Stack>
  );
}
