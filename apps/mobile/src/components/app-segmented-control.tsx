import { SegmentedControl } from "@expo/ui/community/segmented-control";
import type { StyleProp, ViewStyle } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";

export type AppSegmentedControlProps = {
  values: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  style?: StyleProp<ViewStyle>;
};

export function AppSegmentedControl({
  values,
  selectedIndex,
  onIndexChange,
  style,
}: AppSegmentedControlProps) {
  const { colorScheme, colors } = useAppTheme();

  return (
    <SegmentedControl
      values={values}
      selectedIndex={selectedIndex}
      onChange={(event) =>
        onIndexChange(event.nativeEvent.selectedSegmentIndex)
      }
      tintColor={colors.primary}
      appearance={colorScheme === "dark" ? "dark" : "light"}
      style={style}
    />
  );
}
