import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { StudyGlass } from "./study-glass";

export function AssessmentQuestion({
  children,
  detail,
  current,
  total,
  answered,
  onOpen,
  disabled = false,
}: {
  children: ReactNode;
  detail?: string;
  current?: number;
  total?: number;
  answered?: number;
  onOpen?: () => void;
  disabled?: boolean;
}) {
  const showHeader =
    current !== undefined &&
    total !== undefined &&
    answered !== undefined &&
    onOpen;
  const content = (
    <>
      {showHeader ? (
        <View className="gap-2 border-b border-border/70 pb-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-bold text-foreground">
              Question {(current as number) + 1} of {total}
            </Text>
            <Text className="text-sm font-bold text-primary">Questions ▦</Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: total, now: answered }}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <View
              className="h-full rounded-full bg-primary"
              style={{
                width: `${total ? ((answered as number) / (total as number)) * 100 : 0}%`,
              }}
            />
          </View>
          <Text className="text-xs text-muted-foreground">
            {answered} answered · {(total as number) - (answered as number)}{" "}
            remaining
          </Text>
        </View>
      ) : null}
      {detail ? (
        <Text className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground">
          {detail}
        </Text>
      ) : null}
      {children}
    </>
  );
  if (!showHeader) {
    return <StudyGlass>{content}</StudyGlass>;
  }
  return (
    <StudyGlass isInteractive={!disabled}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Questions. ${answered} of ${total} answered. Current question ${(current as number) + 1}.`}
        accessibilityHint="Open the question list to jump to any question"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onOpen}
        className="gap-4 active:opacity-75"
      >
        {content}
      </Pressable>
    </StudyGlass>
  );
}

export function AssessmentOption({
  children,
  index,
  selected,
  multiple = false,
  disabled = false,
  correct,
  onPress,
}: {
  children: ReactNode;
  index: number;
  selected: boolean;
  multiple?: boolean;
  disabled?: boolean;
  correct?: boolean;
  onPress?: () => void;
}) {
  const wrong = correct === false && selected;
  const label =
    correct === true
      ? selected
        ? "Your answer · Correct"
        : "Correct answer"
      : wrong
        ? "Your answer · Incorrect"
        : undefined;
  const content = (
    <StudyGlass
      tone={wrong ? "destructive" : "primary"}
      emphasized={selected || correct === true}
      isInteractive={!!onPress}
    >
      <View className="flex-row items-center gap-4">
        <View
          className={`size-8 items-center justify-center rounded-xl border ${wrong ? "border-destructive bg-destructive" : selected || correct === true ? "border-primary bg-primary" : "border-border bg-muted"}`}
        >
          <Text
            className={`text-sm font-black ${wrong ? "text-destructive-foreground" : selected || correct === true ? "text-primary-foreground" : "text-muted-foreground"}`}
          >
            {correct === true
              ? "✓"
              : wrong
                ? "×"
                : String.fromCharCode(65 + index)}
          </Text>
        </View>
        <View className="min-w-0 flex-1 gap-2">
          {label ? (
            <Text
              className={`text-xs font-bold ${wrong ? "text-destructive" : "text-primary"}`}
            >
              {label}
            </Text>
          ) : null}
          {children}
        </View>
      </View>
    </StudyGlass>
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

export function AssessmentFeedback({
  correct,
  children,
}: {
  correct: boolean;
  children: ReactNode;
}) {
  return (
    <StudyGlass tone={correct ? "primary" : "destructive"}>
      <Text
        accessibilityLiveRegion="polite"
        className={`text-2xl font-black ${correct ? "text-primary" : "text-destructive"}`}
      >
        {correct ? "You got it." : "Almost."}
      </Text>
      {children}
    </StudyGlass>
  );
}
