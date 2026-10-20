import { SymbolView, type SymbolViewProps } from "expo-symbols";
import bold from "expo-symbols/androidWeights/bold";
import extraLight from "expo-symbols/androidWeights/extraLight";
import light from "expo-symbols/androidWeights/light";
import medium from "expo-symbols/androidWeights/medium";
import semiBold from "expo-symbols/androidWeights/semiBold";
import thin from "expo-symbols/androidWeights/thin";

import type { SymbolIconProps } from "./symbol-icon";
import { materialSymbols } from "./symbol-names";

export type { SymbolIconProps } from "./symbol-icon";

type SfWeight = Extract<SymbolViewProps["weight"], string>;

const androidWeights: Partial<Record<SfWeight, typeof bold>> = {
  ultraLight: extraLight,
  thin,
  light,
  medium,
  semibold: semiBold,
  bold,
  heavy: bold,
  black: bold,
};

// expo-symbols draws the glyph as text with lineHeight equal to the size. The
// Material Symbols font has 1056/96 ascent/descent on a 960 em, so Android
// keeps the whole descent and trims the ascent, which leaves the icon 96/960
// of its size above the center of its box. Shift it back down.
const BASELINE_OFFSET = 96 / 960;

export function SymbolIcon({
  name,
  weight,
  size = 24,
  style,
  ...props
}: SymbolIconProps) {
  const android =
    typeof weight === "string" ? androidWeights[weight] : undefined;
  return (
    <SymbolView
      name={{ android: materialSymbols[name] }}
      weight={android ? { ios: "regular", android } : undefined}
      size={size}
      style={[{ transform: [{ translateY: size * BASELINE_OFFSET }] }, style]}
      {...props}
    />
  );
}
