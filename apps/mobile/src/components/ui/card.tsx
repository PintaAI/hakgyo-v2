import type { ReactNode } from "react";
import { View } from "react-native";

const tones = {
  default: "border-border bg-card",
  primary: "border-primary/30 bg-primary/10",
  destructive: "border-destructive/30 bg-destructive/10",
} as const;

/**
 * The standard bordered surface. On phones, screens prefer edge-to-edge
 * sections; use a card for content that needs to stand out on its own.
 */
export function Card({
  children,
  tone = "default",
  className = "gap-3 p-4",
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  /** Replaces the default spacing (`gap-3 p-4`). */
  className?: string;
}) {
  return (
    <View
      className={`overflow-hidden rounded-2xl border ${tones[tone]} ${className}`}
    >
      {children}
    </View>
  );
}
