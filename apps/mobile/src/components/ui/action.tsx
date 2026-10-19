import { ActivityIndicator, Pressable, Text } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";

const variants = {
  primary: {
    box: "border-primary bg-primary",
    text: "text-primary-foreground",
  },
  secondary: { box: "border-border bg-card", text: "text-foreground" },
  destructive: {
    box: "border-destructive bg-destructive",
    text: "text-destructive-foreground",
  },
  destructiveTinted: {
    box: "border-destructive/30 bg-destructive/10",
    text: "text-destructive",
  },
  outline: { box: "border-border", text: "text-primary" },
  link: { box: "border-transparent", text: "text-primary" },
  ghost: { box: "border-transparent", text: "text-muted-foreground" },
} as const;

const sizes = {
  /** The standard 48pt button. */
  default: { box: "min-h-12 px-5 py-3", text: "text-base font-semibold" },
  /** A compact button for tight rows, such as pager controls. */
  sm: { box: "px-4 py-2.5", text: "text-sm font-semibold" },
  /** Text only, for `link` and `ghost` actions that sit within content. */
  inline: { box: "px-0 py-1", text: "text-sm font-bold" },
} as const;

export type ActionVariant = keyof typeof variants;
export type ActionSize = keyof typeof sizes;

/**
 * The standard rectangular button. Glass contexts use `StudyAction` instead.
 */
export function Action({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "default",
  align = "stretch",
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityHint,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  /** Shows a spinner next to the label and blocks presses. */
  loading?: boolean;
  variant?: ActionVariant;
  size?: ActionSize;
  /** `start` hugs the left edge instead of filling the row. */
  align?: "stretch" | "start";
  accessibilityRole?: "button" | "link";
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { colors } = useAppTheme();
  const style = variants[variant];
  const spinnerColor =
    variant === "primary"
      ? colors.primaryForeground
      : variant === "destructive"
        ? colors.destructiveForeground
        : variant === "destructiveTinted"
          ? colors.destructive
          : colors.primary;
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      hitSlop={size === "inline" ? 8 : undefined}
      onPress={onPress}
      className={`flex-row items-center justify-center gap-2 rounded-2xl border active:opacity-80 ${sizes[size].box} ${style.box}`}
      // Only set when disabled: an inline opacity of 1 would override the
      // pressed-state opacity from the class.
      style={{
        ...(disabled ? { opacity: 0.5 } : null),
        ...(align === "start" ? { alignSelf: "flex-start" } : null),
      }}
    >
      {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
      <Text
        className={`text-center ${sizes[size].text} ${style.text}`}
        numberOfLines={2}
      >
        {children}
      </Text>
    </Pressable>
  );
}
