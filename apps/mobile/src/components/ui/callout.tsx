import type { ReactNode } from "react";
import { Text } from "react-native";

const tones = {
  info: "bg-primary/10 text-foreground",
  destructive: "bg-destructive/10 text-destructive",
} as const;

/** An inline message (notice or error) announced to screen readers. */
export function Callout({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <Text
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === "destructive" ? "alert" : undefined}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold ${tones[tone]}`}
    >
      {children}
    </Text>
  );
}
