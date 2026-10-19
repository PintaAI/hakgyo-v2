import type { ReactNode } from "react";
import { Text, View } from "react-native";

const variants = {
  bordered: "rounded-2xl border border-border",
  dashed: "rounded-2xl border border-dashed border-border",
  /** Edge-to-edge between hairlines, for phone layouts without a card. */
  flush: "border-y border-border",
} as const;

/** A titled empty state inside a section (not a whole screen). */
export function EmptyState({
  title,
  children,
  variant = "bordered",
  action,
}: {
  title?: string;
  children: ReactNode;
  variant?: keyof typeof variants;
  action?: ReactNode;
}) {
  return (
    <View className={`items-center gap-2 px-6 py-8 ${variants[variant]}`}>
      {title ? (
        <Text className="text-center text-base font-bold text-foreground">
          {title}
        </Text>
      ) : null}
      <Text className="text-center text-sm leading-5 text-muted-foreground">
        {children}
      </Text>
      {action}
    </View>
  );
}
