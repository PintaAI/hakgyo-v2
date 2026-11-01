import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";

const iconSources = {
  light: require("../../../assets/ios-icon-light.png"),
  dark: require("../../../assets/ios-icon-dark.png"),
};

/** The Hakgyo app icon, following the light or dark appearance. */
export function AppIcon({ size = 64 }: { size?: number }) {
  const { colorScheme, colors } = useAppTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        borderCurve: "continuous",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      <Image
        accessible={false}
        source={iconSources[colorScheme]}
        style={{ width: "100%", height: "100%" }}
        transition={0}
      />
    </View>
  );
}
