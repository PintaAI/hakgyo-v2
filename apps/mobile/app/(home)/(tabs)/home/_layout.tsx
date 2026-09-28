import { Stack } from "expo-router";

import { useTabStackScreenOptions } from "../../../../src/navigation/tab-stack-options";

export default function HomeTabLayout() {
  const screenOptions = useTabStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: "Hari Ini" }} />
    </Stack>
  );
}
