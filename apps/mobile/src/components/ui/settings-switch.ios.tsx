import { Host, Toggle } from "@expo/ui/swift-ui";
import {
  disabled as disabledModifier,
  labelsHidden,
} from "@expo/ui/swift-ui/modifiers";

import { useAppTheme } from "../../providers/AppThemeProvider";
import type { SettingsSwitchProps } from "./settings-switch";

/**
 * A SwiftUI toggle. React Native's `Switch` draws the iOS 26 switch at the top
 * of its box instead of centred in the row; SwiftUI sizes it natively.
 */
export function SettingsSwitch({
  label,
  value,
  onValueChange,
  disabled = false,
}: SettingsSwitchProps) {
  const { colorScheme, colors } = useAppTheme();
  return (
    <Host matchContents colorScheme={colorScheme} seedColor={colors.primary}>
      <Toggle
        isOn={value}
        // Read by VoiceOver; the row already shows it.
        label={label}
        modifiers={[labelsHidden(), disabledModifier(disabled)]}
        onIsOnChange={onValueChange}
      />
    </Host>
  );
}
