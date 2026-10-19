import { Stack } from "expo-router";

import { formSheetOptions } from "../../../../src/navigation/sheet-options";
import { useTabStackScreenOptions } from "../../../../src/navigation/tab-stack-options";

const detailOptions = formSheetOptions({
  detents: { ios: "fitToContents", android: [0.55, 0.9] },
  transparentHeader: true,
  systemCornerRadius: true,
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
