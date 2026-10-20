import { ActivityIndicator, Pressable, Text } from "react-native";

import type { ThemeColors } from "../../theme/colors";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { SymbolIcon } from "./symbol-icon";
import type { SymbolName } from "./symbol-names";

const variants = {
  primary: {
    box: "border-primary bg-primary",
    text: "text-primary-foreground",
    icon: (c: ThemeColors) => c.primaryForeground,
  },
  secondary: {
    box: "border-border bg-card",
    text: "text-foreground",
    icon: (c: ThemeColors) => c.foreground,
  },
  destructive: {
    box: "border-destructive bg-destructive",
    text: "text-destructive-foreground",
    icon: (c: ThemeColors) => c.destructiveForeground,
  },
  destructiveTinted: {
    box: "border-destructive/30 bg-destructive/10",
    text: "text-destructive",
    icon: (c: ThemeColors) => c.destructive,
  },
  outline: {
    box: "border-border",
    text: "text-primary",
    icon: (c: ThemeColors) => c.primary,
  },
  link: {
    box: "border-transparent",
    text: "text-primary",
    icon: (c: ThemeColors) => c.primary,
  },
  ghost: {
    box: "border-transparent",
    text: "text-muted-foreground",
    icon: (c: ThemeColors) => c.mutedForeground,
  },
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
  leadingIcon,
  trailingIcon,
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
  /** Icon before the label, such as a back arrow. */
  leadingIcon?: SymbolName;
  /** Icon after the label, such as a forward arrow. */
  trailingIcon?: SymbolName;
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
  const iconColor = variants[variant].icon(colors);
  const iconSize = size === "sm" || size === "inline" ? 16 : 18;
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
      {leadingIcon ? (
        <SymbolIcon
          name={leadingIcon}
          size={iconSize}
          weight="semibold"
          tintColor={iconColor}
        />
      ) : null}
      <Text
        className={`shrink text-center ${sizes[size].text} ${style.text}`}
        numberOfLines={2}
      >
        {children}
      </Text>
      {trailingIcon ? (
        <SymbolIcon
          name={trailingIcon}
          size={iconSize}
          weight="semibold"
          tintColor={iconColor}
        />
      ) : null}
    </Pressable>
  );
}
