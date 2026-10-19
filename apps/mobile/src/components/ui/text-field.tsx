import { TextInput, type TextInputProps } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";

/** The standard bordered text input. */
export function TextField(props: TextInputProps) {
  const { colors } = useAppTheme();
  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      {...props}
      className={`rounded-2xl border border-input bg-background px-4 py-3 text-base text-foreground ${props.className ?? ""}`}
    />
  );
}
