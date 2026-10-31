import { ActivityIndicator } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import type { SyncActivityKind } from "../../sync/activity";
import { SymbolIcon } from "../ui/symbol-icon";
import type { SymbolName } from "../ui/symbol-names";

const symbols: Record<Exclude<SyncActivityKind, "downloading">, SymbolName> = {
  changed: "checkmark.circle.fill",
  failed: "exclamationmark.triangle.fill",
  waiting: "icloud.slash",
};

/** A spinner while downloading, otherwise the symbol of the activity. */
export function SyncActivityIcon({
  kind,
  size = 20,
}: {
  kind: SyncActivityKind;
  size?: number;
}) {
  const { colors } = useAppTheme();
  if (kind === "downloading") {
    return <ActivityIndicator size="small" color={colors.primary} />;
  }
  const tint =
    kind === "failed"
      ? colors.destructive
      : kind === "waiting"
        ? colors.mutedForeground
        : colors.primary;
  return <SymbolIcon name={symbols[kind]} size={size} tintColor={tint} />;
}
