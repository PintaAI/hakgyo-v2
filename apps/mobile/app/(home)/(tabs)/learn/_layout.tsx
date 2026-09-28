import { Stack } from "expo-router";

import { useTabStackScreenOptions } from "../../../../src/navigation/tab-stack-options";

export default function LearnTabLayout() {
  const screenOptions = useTabStackScreenOptions();

  return (
    <Stack screenOptions={{ ...screenOptions, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: "" }} />
    </Stack>
  );
}
