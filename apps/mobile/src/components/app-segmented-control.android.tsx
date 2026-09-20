import {
  Host,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text,
} from "@expo/ui/jetpack-compose";

import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import type { AppSegmentedControlProps } from "./app-segmented-control";

export function AppSegmentedControl({
  values,
  selectedIndex,
  onIndexChange,
  style,
}: AppSegmentedControlProps) {
  const { colorScheme, colors } = useAppTheme();
  const isDark = colorScheme === "dark";
  const buttonColors = {
    activeBorderColor: withOpacity(colors.primary, isDark ? 0.55 : 0.4),
    activeContainerColor: withOpacity(colors.primary, isDark ? 0.28 : 0.16),
    activeContentColor: colors.primary,
    inactiveBorderColor: withOpacity(
      colors.mutedForeground,
      isDark ? 0.45 : 0.3,
    ),
    inactiveContainerColor: colors.background,
    inactiveContentColor: colors.mutedForeground,
  };

  return (
    <Host
      matchContents={{ vertical: true }}
      colorScheme={isDark ? "dark" : "light"}
      seedColor={colors.primary}
      style={style}
    >
      <SingleChoiceSegmentedButtonRow>
        {values.map((label, index) => {
          const selected = index === selectedIndex;

          return (
            <SegmentedButton
              key={`${label}-${index}`}
              selected={selected}
              onClick={() => onIndexChange(index)}
              colors={buttonColors}
            >
              <SegmentedButton.Label>
                <Text
                  style={{
                    typography: "labelLarge",
                    fontWeight: selected ? "700" : "500",
                  }}
                >
                  {label}
                </Text>
              </SegmentedButton.Label>
            </SegmentedButton>
          );
        })}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}
