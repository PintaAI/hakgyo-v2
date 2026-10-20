import { View } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { SymbolIcon } from "./symbol-icon";

/** The disclosure arrow at the end of a tappable row. */
export function Chevron({ className = "" }: { className?: string }) {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityElementsHidden
      className={`justify-center ${className}`}
      importantForAccessibility="no-hide-descendants"
    >
      <SymbolIcon
        name="chevron.right"
        size={14}
        weight="semibold"
        tintColor={colors.mutedForeground}
      />
    </View>
  );
}
