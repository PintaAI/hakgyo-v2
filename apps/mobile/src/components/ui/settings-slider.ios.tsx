import { Host, Image, Slider, Text } from "@expo/ui/swift-ui";

import { useAppTheme } from "../../providers/AppThemeProvider";
import type { SettingsSliderProps } from "./settings-slider";

/** A SwiftUI slider, with the small and large "A" of the system's text size slider. */
export function SettingsSlider({
  label,
  value,
  min,
  max,
  step,
  onValueChange,
  onCommit,
}: SettingsSliderProps) {
  const { colorScheme, colors } = useAppTheme();
  return (
    <Host
      matchContents={{ vertical: true }}
      colorScheme={colorScheme}
      seedColor={colors.primary}
    >
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        // Read by VoiceOver; the row already shows it.
        label={<Text>{label}</Text>}
        minimumValueLabel={
          <Image
            systemName="textformat.size.smaller"
            color={colors.mutedForeground}
          />
        }
        maximumValueLabel={
          <Image
            systemName="textformat.size.larger"
            color={colors.mutedForeground}
          />
        }
        onValueChange={onValueChange}
        onEditingChanged={(editing) => {
          if (!editing) onCommit();
        }}
      />
    </Host>
  );
}
