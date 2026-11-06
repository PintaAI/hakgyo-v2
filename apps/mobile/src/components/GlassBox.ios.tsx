import { useSyncExternalStore } from "react";
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

/**
 * "Reduce Transparency", read once for the whole app. Each box used to ask
 * for itself and render a plain View until the answer came, then swap to a
 * GlassView, remounting its children: on every screen, for every box.
 * Glass is assumed until iOS says otherwise, so only learners who turned the
 * setting on see a swap, once.
 */
let reduceTransparency = false;
const listeners = new Set<() => void>();

function setReduceTransparency(enabled: boolean) {
  if (enabled === reduceTransparency) return;
  reduceTransparency = enabled;
  for (const listener of listeners) listener();
}

void AccessibilityInfo.isReduceTransparencyEnabled()
  .then(setReduceTransparency)
  .catch(() => undefined);
AccessibilityInfo.addEventListener(
  "reduceTransparencyChanged",
  setReduceTransparency,
);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const liquidGlass =
  Platform.OS === "ios" &&
  isLiquidGlassAvailable() &&
  isGlassEffectAPIAvailable();

export function GlassBox({
  isInteractive,
  tintColor,
  glassEffectStyle,
  colorScheme,
  style,
  children,
  ...viewProps
}: GlassBoxProps) {
  const reduced = useSyncExternalStore(
    subscribe,
    () => reduceTransparency,
    () => false,
  );
  const glassAvailable = liquidGlass && !reduced;

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
