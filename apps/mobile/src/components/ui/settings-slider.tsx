import { Host, Slider } from "@expo/ui/jetpack-compose";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";

export type SettingsSliderProps = {
  /** What the slider sets, for screen readers. */
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** While the thumb moves. */
  onValueChange: (value: number) => void;
  /** When the finger lifts: the value to keep. */
  onCommit: () => void;
};

/** A Material 3 slider (Jetpack Compose); iOS uses SwiftUI (`.ios.tsx`). */
export function SettingsSlider({
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
        // The positions between both ends.
        steps={Math.round((max - min) / step) - 1}
        colors={{
          thumbColor: colors.primary,
          activeTrackColor: colors.primary,
          inactiveTrackColor: withOpacity(colors.mutedForeground, 0.25),
        }}
        onValueChange={onValueChange}
        onValueChangeFinished={onCommit}
      />
    </Host>
  );
}
