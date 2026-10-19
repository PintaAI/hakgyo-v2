import type { ReactNode } from "react";
import { Text } from "react-native";

const tones = {
  muted: "text-muted-foreground",
  primary: "text-primary",
  foreground: "text-foreground",
  destructive: "text-destructive",
  onPrimary: "text-primary-foreground/70",
} as const;

const sizes = {
  xs: "text-[10px]",
  sm: "text-[11px]",
  md: "text-xs",
} as const;

/** A small uppercase label above a title or inside a section. */
export function Eyebrow({
  children,
  tone = "muted",
  size = "sm",
  className = "",
  numberOfLines,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  /** Layout only (alignment, flex); type styles come from `tone` and `size`. */
  className?: string;
  numberOfLines?: number;
}) {
  return (
    <Text
      className={`${sizes[size]} font-bold uppercase tracking-[1.5px] ${tones[tone]} ${className}`}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}
