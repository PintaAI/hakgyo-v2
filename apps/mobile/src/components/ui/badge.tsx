import type { ReactNode } from "react";
import { Text, View } from "react-native";

const tones = {
  primary: { box: "bg-primary/10", text: "text-primary" },
  destructive: { box: "bg-destructive", text: "text-destructive-foreground" },
} as const;

const sizes = {
  sm: { box: "px-1.5 py-0.5", text: "text-[10px]" },
  md: { box: "px-2.5 py-1", text: "text-xs" },
} as const;

/** A small pill for a count, status or amount. */
export function Badge({
  children,
  tone = "primary",
  size = "md",
  accessibilityLabel,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  accessibilityLabel?: string;
}) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      className={`rounded-full ${tones[tone].box} ${sizes[size].box}`}
    >
      <Text
        className={`font-bold tabular-nums ${tones[tone].text} ${sizes[size].text}`}
      >
        {children}
      </Text>
    </View>
  );
}
