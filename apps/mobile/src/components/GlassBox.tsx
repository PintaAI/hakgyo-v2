import { StyleSheet, View, type ViewProps } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { blendOver } from "../theme/colors";

type GlassStyle = "clear" | "regular" | "none";
type GlassColorScheme = "auto" | "light" | "dark";
type GlassEffectStyleConfig = {
  style: GlassStyle;
  animate?: boolean;
  animationDuration?: number;
};

type GlassBoxProps = ViewProps & {
  isInteractive?: boolean;
  tintColor?: string;
  glassEffectStyle?: GlassStyle | GlassEffectStyleConfig;
  colorScheme?: GlassColorScheme;
};

export function GlassBox({
  tintColor,
  style,
  children,
  isInteractive: _isInteractive,
  glassEffectStyle: _glassEffectStyle,
  colorScheme: _colorScheme,
  ...viewProps
}: GlassBoxProps) {
  const { colors } = useAppTheme();
  // There is no glass backdrop here, and glass tints are too faint on their
  // own: composite the tint onto the card (or the caller's) surface.
  const ownBackground = StyleSheet.flatten(style)?.backgroundColor;
  const base = typeof ownBackground === "string" ? ownBackground : colors.card;
  const backgroundColor = tintColor ? blendOver(base, tintColor) : base;

  return (
    <View style={[style, { backgroundColor }]} {...viewProps}>
      {children}
    </View>
  );
}
