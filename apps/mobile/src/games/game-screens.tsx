import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView } from "react-native";

import { toolbarIcons } from "../theme/toolbar-icons";

export function GameBackToolbar({
  disabled = false,
  onPress,
}: {
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button
        accessibilityLabel="Back to Practice"
        disabled={disabled}
        icon={toolbarIcons.back}
        onPress={onPress}
      />
    </Stack.Toolbar>
  );
}

export function GamePage({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}
    >
      {children}
    </ScrollView>
  );
}
