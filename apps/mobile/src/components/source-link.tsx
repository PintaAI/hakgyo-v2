import { Pressable, Text } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { SymbolIcon } from "./ui/symbol-icon";

/**
 * Where a practice item on Home comes from, as a quiet link under it:
 * "Dari <title> · <course> ›". Home's daily questions open their tugas and
 * today's vocabulary its set, from the same place in both.
 */
export function SourceLink({
  title,
  courseTitle,
  hint,
  align = "start",
  onPress,
}: {
  title: string;
  courseTitle: string;
  /** What opening it does, for screen readers. */
  hint: string;
  /** Where the link sits in its row; Home's vocabulary centres it under the deck. */
  align?: "start" | "center";
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Dari ${title}, ${courseTitle}`}
      accessibilityHint={hint}
      hitSlop={8}
      onPress={onPress}
      className={`flex-row items-center gap-1 active:opacity-60 ${align === "center" ? "self-center" : "self-start"}`}
    >
      <Text className="shrink text-xs text-muted-foreground" numberOfLines={1}>
        Dari <Text className="font-semibold text-primary">{title}</Text> ·{" "}
        {courseTitle}
      </Text>
      <SymbolIcon name="chevron.right" size={12} tintColor={colors.primary} />
    </Pressable>
  );
}
