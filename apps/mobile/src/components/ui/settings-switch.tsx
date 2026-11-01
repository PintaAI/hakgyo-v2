import { Switch } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";

export type SettingsSwitchProps = {
  /** What the switch controls, for screen readers. */
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

/** The platform switch of a settings row; iOS uses SwiftUI (`.ios.tsx`). */
export function SettingsSwitch({
  label,
  value,
  onValueChange,
  disabled = false,
}: SettingsSwitchProps) {
  const { colors } = useAppTheme();
  return (
    <Switch
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: colors.primary }}
    />
  );
}
