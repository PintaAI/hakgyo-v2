import { Children, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SymbolIcon } from "./ui/symbol-icon";
import { useAppTheme } from "../providers/AppThemeProvider";
import { QUESTION_DONE_COLOR } from "../lib/question-colors";
import { withOpacity } from "../theme/colors";

// EPS-TOPIK numbers picture options ①–④.
const circledNumbers = ["①", "②", "③", "④"];

/** Holds a question's options: a list, or the 2×2 grid for picture options. */
export function AssessmentOptions({
  children,
  grid,
}: {
  children: ReactNode;
  grid: boolean;
}) {
  if (!grid) return <View className="gap-3">{children}</View>;
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {Children.map(children, (child) => (
        // Two per row, with the space between them as the gap.
        <View className="w-[48%]">{child}</View>
      ))}
    </View>
  );
}

export function AssessmentOption({
  children,
  index,
  selected,
  multiple = false,
  disabled = false,
  correct,
  tile = false,
  onPress,
}: {
  children: ReactNode;
  index: number;
  selected: boolean;
  multiple?: boolean;
  disabled?: boolean;
  correct?: boolean;
  /** A picture option in the 2×2 grid (`usesPictureGrid`): badge on top, numbered ①–④. */
  tile?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const wrong = correct === false && selected;
  const label =
    correct === true
      ? selected
        ? "Jawaban kamu · Benar"
        : "Jawaban benar"
      : wrong
        ? "Jawaban kamu · Salah"
        : undefined;
  // Graded: green for the right answer (the colour of a right question in
  // the status dots), red for a wrong choice. Before grading the choice
  // takes the brand colour.
  const right = correct === true;
  const tone = wrong
    ? colors.destructive
    : right
      ? QUESTION_DONE_COLOR
      : colors.primary;
  const emphasized = selected || right;
  const badgeColor = wrong || right || selected ? tone : undefined;
  const body = (
    <View className={tile ? "gap-2" : "flex-row items-center gap-4"}>
      <View
        className={`size-8 items-center justify-center rounded-xl ${badgeColor ? "" : "border border-border bg-muted"}`}
        style={badgeColor ? { backgroundColor: badgeColor } : undefined}
      >
        {right || wrong ? (
          <SymbolIcon
            name={wrong ? "xmark" : "checkmark"}
            size={16}
            weight="bold"
            tintColor="#ffffff"
          />
        ) : (
          <Text
            className={`text-sm font-black ${selected ? "text-primary-foreground" : "text-muted-foreground"}`}
          >
            {tile
              ? (circledNumbers[index] ?? String(index + 1))
              : String.fromCharCode(65 + index)}
          </Text>
        )}
      </View>
      <View className={tile ? "gap-2" : "min-w-0 flex-1 gap-2"}>
        {label ? (
          <Text className="text-xs font-bold" style={{ color: tone }}>
            {label}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );
  const content = (
    <View
      className={`rounded-2xl border ${tile ? "gap-2 p-3" : "gap-4 p-5"}`}
      style={{
        backgroundColor: emphasized ? withOpacity(tone, 0.1) : colors.card,
        // A light edge: the tint carries the state, not a heavy outline.
        borderColor: emphasized ? withOpacity(tone, 0.45) : colors.border,
      }}
    >
      {body}
    </View>
  );
  if (!onPress) return <View>{content}</View>;
  return (
    <Pressable
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityState={{ checked: selected, disabled }}
      accessibilityHint={label}
      disabled={disabled}
      onPress={onPress}
      className="rounded-2xl active:opacity-75"
      style={correct === false && !selected ? { opacity: 0.6 } : undefined}
    >
      {content}
    </Pressable>
  );
}
