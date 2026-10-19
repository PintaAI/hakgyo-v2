import { ActivityIndicator, Text, View } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";

/** The standard loading indicator, optionally with a caption. */
export function Spinner({ label }: { label?: string }) {
  const { colors } = useAppTheme();
  return (
    <View className="items-center gap-3">
      <ActivityIndicator
        accessibilityLabel={label ?? "Memuat"}
        color={colors.primary}
      />
      {label ? (
        <Text className="text-sm text-muted-foreground">{label}</Text>
      ) : null}
    </View>
  );
}
