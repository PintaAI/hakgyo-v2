import { Stack } from "expo-router";
import { Platform } from "react-native";

import { useAppTheme } from "../../../../src/providers/AppThemeProvider";

export default function ProfileTabLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShown: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTransparent: Platform.OS === "ios",
      }}
    />
  );
}
