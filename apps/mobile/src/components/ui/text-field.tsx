import { TextInput, type TextInputProps } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";

/**
 * The standard bordered single-line text input, as tall as an `Action`.
 *
 * The font size is set in `style` rather than with `text-base`, whose 24pt
 * line height pushes the text of a single-line iOS `TextInput` down until its
 * bottom is clipped. A fixed height with no vertical padding centres the text
 * on both platforms.
 */
export function TextField({ style, ...props }: TextInputProps) {
  const { colors } = useAppTheme();
  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      {...props}
      className={`rounded-2xl border border-input bg-background px-4 text-foreground ${props.className ?? ""}`}
      style={[
        {
          fontSize: 16,
          height: 48,
          includeFontPadding: false,
          paddingVertical: 0,
          textAlignVertical: "center",
        },
        style,
      ]}
    />
  );
}
