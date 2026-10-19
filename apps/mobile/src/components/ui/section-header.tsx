import type { ReactNode } from "react";
import { Text, View } from "react-native";

/** A section title with optional supporting text on the right. */
export function SectionHeader({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text
        accessibilityRole="header"
        className="min-w-0 shrink text-xl font-bold text-foreground"
      >
        {title}
      </Text>
      {trailing}
    </View>
  );
}
