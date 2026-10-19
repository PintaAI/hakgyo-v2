import type { ReactNode } from "react";
import { View } from "react-native";

const sizes = {
  sm: "size-7",
  md: "size-9",
  lg: "size-16",
} as const;

const tones = {
  primary: "bg-primary/10",
  solid: "bg-primary",
  muted: "bg-muted",
} as const;

/** A round tile that holds a symbol or glyph. */
export function IconCircle({
  children,
  size = "md",
  tone = "primary",
}: {
  children: ReactNode;
  size?: keyof typeof sizes;
  tone?: keyof typeof tones;
}) {
  return (
    <View
      className={`${sizes[size]} items-center justify-center rounded-full ${tones[tone]}`}
    >
      {children}
    </View>
  );
}
