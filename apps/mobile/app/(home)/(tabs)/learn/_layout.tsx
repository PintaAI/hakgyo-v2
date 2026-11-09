import { Stack } from "expo-router";
import { Platform } from "react-native";

import { useTabStackScreenOptions } from "../../../../src/navigation/tab-stack-options";

export default function LearnTabLayout() {
  const screenOptions = useTabStackScreenOptions();

  return (
    <Stack screenOptions={{ ...screenOptions, headerShadowVisible: false }}>
      <Stack.Screen
        name="index"
        options={{
          title: "",
          // The class card runs up under the header (bleedTop), so the soft
          // scroll edge would frost it even at rest. Clear, like Hari Ini at
          // rest; the header's buttons are glass of their own.
          scrollEdgeEffects:
            Platform.OS === "ios" ? { top: "hidden" } : undefined,
        }}
      />
    </Stack>
  );
}
