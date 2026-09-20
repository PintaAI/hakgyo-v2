import type { ReactNode } from "react";
import { ScrollView } from "react-native";

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
