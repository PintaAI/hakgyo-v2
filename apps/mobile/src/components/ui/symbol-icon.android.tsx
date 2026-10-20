import { SymbolView, type SymbolViewProps } from "expo-symbols";
import bold from "expo-symbols/androidWeights/bold";
import semiBold from "expo-symbols/androidWeights/semiBold";

import type { SymbolIconProps } from "./symbol-icon";
import { materialSymbols } from "./symbol-names";

export type { SymbolIconProps } from "./symbol-icon";

type SfWeight = Extract<SymbolViewProps["weight"], string>;

// Each imported weight bundles a ~950KB font, so only the weights the app uses
// are mapped; any other SF weight draws as regular.
const androidWeights: Partial<Record<SfWeight, typeof bold>> = {
  semibold: semiBold,
  bold,
  heavy: bold,
  black: bold,
};

export function SymbolIcon({ name, weight, ...props }: SymbolIconProps) {
  const android =
    typeof weight === "string" ? androidWeights[weight] : undefined;
  return (
    <SymbolView
      name={{ android: materialSymbols[name] }}
      weight={android ? { ios: "regular", android } : undefined}
      {...props}
    />
  );
}
