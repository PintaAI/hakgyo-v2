import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  View,
  type ViewProps,
} from "react-native";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";

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
  isInteractive,
  tintColor,
  glassEffectStyle,
  colorScheme,
  style,
  children,
  ...viewProps
}: GlassBoxProps) {
  const [reduceTransparency, setReduceTransparency] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    void AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      if (!cancelled) setReduceTransparency(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      (enabled) => {
        if (!cancelled) setReduceTransparency(enabled);
      },
    );

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const glassAvailable =
    Platform.OS === "ios" &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable() &&
    reduceTransparency === false;

  if (glassAvailable) {
    return (
      <GlassView
        isInteractive={isInteractive}
        tintColor={tintColor}
        glassEffectStyle={glassEffectStyle}
        colorScheme={colorScheme}
        style={style}
        {...viewProps}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={tintColor ? [style, { backgroundColor: tintColor }] : style}
      {...viewProps}
    >
      {children}
    </View>
  );
}
