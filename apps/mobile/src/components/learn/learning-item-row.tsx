import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

import {
  getLearningItemTypeMeta,
  type LearningItemType,
} from "../../lib/learning-item-type";
import { useAppTheme } from "../../providers/AppThemeProvider";

function typeIcon(type: LearningItemType) {
  if (type === "VOCABULARY_SET") return "character.book.closed.fill";
  if (type === "ASSESSMENT") return "checkmark.seal.fill";
  return "doc.text.fill";
}

function typeFallback(type: LearningItemType) {
  if (type === "VOCABULARY_SET") return "Aa";
  if (type === "ASSESSMENT") return "✓";
  return "•";
}

// Shared learning-item row: icon circle + connecting rail + title + detail
// with the per-type highlight colors (border/soft background tint, glyph,
// label). Used by the course outline list and the practice library.
export function LearningItemRow({
  title,
  type,
  typeLabel,
  statusText,
  completed,
  locked = false,
  highlighted = false,
  isLast,
  detailLines = 2,
  titleLines = 1,
  showChevron = true,
  onPress,
  disabled,
  accessibilityHint,
}: {
  title: string;
  type: LearningItemType;
  typeLabel?: string;
  statusText: string;
  completed: boolean;
  locked?: boolean;
  highlighted?: boolean;
  isLast: boolean;
  detailLines?: number;
  titleLines?: number;
  showChevron?: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const { colors } = useAppTheme();
  const meta = getLearningItemTypeMeta(type);
  return (
    <View className={isLast ? "pb-1" : "pb-6"}>
      {!isLast ? (
        <View className="absolute bottom-0 left-5 top-8 w-px bg-border" />
      ) : null}
      <View
        className={`flex-row ${highlighted ? "-mx-1 -my-2 rounded-xl bg-primary/10 px-1 py-2" : ""}`}
      >
        <View className="w-10 items-center">
          <View
            className={`size-8 items-center justify-center rounded-full border ${completed ? "border-primary bg-primary" : locked ? "border-border bg-background" : `${meta.borderClass} ${meta.softClass}`}`}
          >
            <SymbolView
              fallback={
                <Text
                  className={`text-xs font-black ${completed ? "text-primary-foreground" : "text-primary"}`}
                >
                  {completed ? "✓" : typeFallback(type)}
                </Text>
              }
              name={
                completed ? "checkmark" : locked ? "lock.fill" : typeIcon(type)
              }
              size={14}
              tintColor={
                completed
                  ? colors.primaryForeground
                  : locked
                    ? colors.mutedForeground
                    : colors.primary
              }
              weight="semibold"
            />
          </View>
        </View>
        <Pressable
          accessibilityHint={accessibilityHint}
          accessibilityRole="button"
          accessibilityState={disabled ? { disabled } : undefined}
          className="min-w-0 flex-1 pl-3 active:opacity-60"
          disabled={disabled}
          onPress={onPress}
        >
          <View className="flex-row items-start gap-3">
            <View className="min-w-0 flex-1 gap-1">
              <Text
                className={`text-[15px] font-semibold leading-5 ${highlighted ? "text-primary" : "text-foreground"}`}
                numberOfLines={titleLines}
              >
                {title}
              </Text>
              <Text
                className="text-xs leading-4 text-muted-foreground"
                numberOfLines={detailLines}
              >
                <Text className={`font-semibold ${meta.textClass}`}>
                  {typeLabel ?? meta.label}
                </Text>
                {" · "}
                {statusText}
              </Text>
            </View>
            {showChevron ? (
              <Text className="pt-0.5 text-lg text-muted-foreground">›</Text>
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}
