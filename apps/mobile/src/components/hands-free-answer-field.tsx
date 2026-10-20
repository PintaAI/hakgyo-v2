import type { Ref } from "react";
import { Pressable, Text, View, type TextInput } from "react-native";
import Animated, {
  type AnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import type { ViewStyle } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { GlassInput } from "./learning-ui";
import { VoiceLevelMeter } from "./voice-level-meter";
import { SymbolIcon } from "./ui/symbol-icon";
import type { SymbolName } from "./ui/symbol-names";

const FIELD_HEIGHT = 44;

function FieldIconButton({
  accessibilityLabel,
  busy = false,
  disabled = false,
  dimmed = false,
  symbol,
  color,
  onPress,
}: {
  accessibilityLabel: string;
  busy?: boolean;
  disabled?: boolean;
  /** Fades the icon without disabling it. */
  dimmed?: boolean;
  symbol: SymbolName;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      onPress={onPress}
      className="rounded-full active:opacity-75"
      style={{ opacity: dimmed ? 0.4 : 1 }}
    >
      <View className="size-10 items-center justify-center">
        <SymbolIcon
          name={symbol}
          size={22}
          style={{ height: 22, width: 22 }}
          tintColor={color}
          weight="bold"
        />
      </View>
    </Pressable>
  );
}

/**
 * The answer pill under a practice card: a hands-free mic on the left, the
 * typed or spoken answer in the middle, and check / next on the right. While
 * hands-free waits for a word the empty field shows the voice level meter.
 */
export function HandsFreeAnswerField({
  inputRef,
  accessibilityLabel,
  value,
  placeholder,
  misheard,
  shakeStyle,
  levels,
  returnKeyType,
  onChangeText,
  onFocus,
  onBlur,
  onSubmitEditing,
  mic,
  action,
}: {
  inputRef: Ref<TextInput>;
  accessibilityLabel: string;
  value: string;
  placeholder: string;
  /** A misheard word, shown in red in place of the answer. */
  misheard: string | null;
  shakeStyle: AnimatedStyle<ViewStyle>;
  /** Voice levels to draw while the field is empty; omit to show the placeholder. */
  levels?: SharedValue<number[]>;
  returnKeyType: "next" | "done";
  onChangeText: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmitEditing: () => void;
  mic?: {
    active: boolean;
    busy: boolean;
    disabled: boolean;
    dimmed: boolean;
    onPress: () => void;
  };
  action: {
    kind: "check" | "next";
    accessibilityLabel: string;
    busy: boolean;
    disabled: boolean;
    dimmed: boolean;
    onPress: () => void;
  };
}) {
  const { colors } = useAppTheme();
  return (
    <Animated.View style={[{ flex: 1, height: FIELD_HEIGHT }, shakeStyle]}>
      <GlassInput
        inputRef={inputRef}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        blurOnSubmit={false}
        height={FIELD_HEIGHT}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        returnKeyType={returnKeyType}
        value={misheard ?? value}
        textColor={misheard ? colors.destructive : undefined}
        placeholderContent={
          levels ? (
            <VoiceLevelMeter levels={levels} color={colors.primary} />
          ) : undefined
        }
        leading={
          mic ? (
            <FieldIconButton
              accessibilityLabel={
                mic.active
                  ? "Hentikan latihan tanpa sentuh"
                  : "Mulai latihan tanpa sentuh"
              }
              busy={mic.busy}
              disabled={mic.disabled}
              dimmed={mic.dimmed}
              symbol={mic.active ? "stop.fill" : "mic.fill"}
              color={mic.active ? colors.destructive : colors.primary}
              onPress={mic.onPress}
            />
          ) : undefined
        }
        trailing={
          <FieldIconButton
            accessibilityLabel={action.accessibilityLabel}
            busy={action.busy}
            disabled={action.disabled}
            dimmed={action.dimmed}
            symbol={action.kind === "next" ? "arrow.right" : "paperplane.fill"}
            color={colors.primary}
            onPress={action.onPress}
          />
        }
      />
    </Animated.View>
  );
}
