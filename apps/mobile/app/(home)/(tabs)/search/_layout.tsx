import { Stack } from "expo-router";

import { useTabStackScreenOptions } from "../../../../src/navigation/tab-stack-options";

export default function SearchTabLayout() {
  const screenOptions = useTabStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: "Cari" }} />
    </Stack>
  );
}
