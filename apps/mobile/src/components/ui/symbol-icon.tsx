import { SymbolView, type SymbolViewProps } from "expo-symbols";

import type { SymbolName } from "./symbol-names";

export type SymbolIconProps = Omit<SymbolViewProps, "name" | "fallback"> & {
  /** SF Symbol name; Android draws the Material Symbol mapped in `symbol-names.ts`. */
  name: SymbolName;
};

export function SymbolIcon({ name, ...props }: SymbolIconProps) {
  return <SymbolView name={name} {...props} />;
}
