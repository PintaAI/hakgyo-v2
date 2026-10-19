import type { ReactNode, Ref } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { glassTint } from "../../theme/colors";
import { GlassBox } from "../GlassBox";

const SLOT_SIZE = 40;
const SLOT_INSET = 4;

/**
 * A glass pill with a centred text input and an optional placeholder, used
 * for search and answer fields. `leading` and `trailing` are overlaid at the
 * ends of the pill (about 40pt square, such as an icon button); the text keeps
 * clear of them.
 */
export function GlassInput({
  value,
  onChangeText,
  placeholder,
  height = 44,
  inputRef,
  leading,
  trailing,
  ...inputProps
}: Omit<TextInputProps, "style" | "placeholder" | "value" | "onChangeText"> & {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Pill height; keep it at least 40 so the slots fit. */
  height?: number;
  inputRef?: Ref<TextInput>;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  const { colors, colorScheme } = useAppTheme();
  const gutter = SLOT_SIZE + SLOT_INSET + 8;
  const slotStyle = {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
  } as const;
  return (
    <GlassBox
      isInteractive
      tintColor={glassTint(colors, colorScheme)}
      glassEffectStyle="clear"
      style={{ borderRadius: 9999, flex: 1, height }}
    >
      {leading ? (
        <View style={[slotStyle, { left: SLOT_INSET }]}>{leading}</View>
      ) : null}
      {value.length === 0 ? (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center px-14"
        >
          <Text
            className="text-center text-base"
            numberOfLines={1}
            style={{ color: colors.mutedForeground }}
          >
            {placeholder}
          </Text>
        </View>
      ) : null}
      <TextInput
        {...inputProps}
        ref={inputRef}
        onChangeText={onChangeText}
        selectionColor={colors.primary}
        value={value}
        style={{
          color: colors.foreground,
          fontSize: 16,
          height,
          includeFontPadding: false,
          paddingHorizontal: gutter,
          paddingVertical: 0,
          textAlign: "center",
          textAlignVertical: "center",
          width: "100%",
        }}
      />
      {trailing ? (
        <View style={[slotStyle, { right: SLOT_INSET }]}>{trailing}</View>
      ) : null}
    </GlassBox>
  );
}
