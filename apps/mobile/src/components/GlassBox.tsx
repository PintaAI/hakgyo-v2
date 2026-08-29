import { View, type ViewProps } from "react-native";

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
  return (
    <View
      style={tintColor ? [style, { backgroundColor: tintColor }] : style}
      {...viewProps}
    >
      {children}
    </View>
  );
}
