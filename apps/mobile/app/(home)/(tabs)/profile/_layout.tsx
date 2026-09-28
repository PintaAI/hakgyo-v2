import { Stack } from "expo-router";
import { Platform } from "react-native";

import { useTabStackScreenOptions } from "../../../../src/navigation/tab-stack-options";

const detailOptions = Platform.select({
  ios: {
    presentation: "formSheet" as const,
    headerLargeTitle: false,
    headerTransparent: true,
    sheetAllowedDetents: "fitToContents" as const,
    sheetExpandsWhenScrolledToEdge: false,
    sheetGrabberVisible: true,
  },
  default: {
    presentation: "formSheet" as const,
    headerLargeTitle: false,
    headerTransparent: false,
    sheetAllowedDetents: [0.55, 0.9] as [number, number],
    sheetInitialDetentIndex: 0,
    sheetCornerRadius: 28,
    sheetElevation: 24,
    sheetShouldOverflowTopInset: false,
    sheetLargestUndimmedDetentIndex: "none" as const,
  },
});

export default function ProfileTabLayout() {
  const screenOptions = useTabStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account" options={detailOptions} />
    </Stack>
  );
}
