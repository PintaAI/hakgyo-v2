import { ActivityIndicator } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import type { SyncActivityKind } from "../../sync/activity";
import { SymbolIcon } from "../ui/symbol-icon";
import type { SymbolName } from "../ui/symbol-names";

const symbols: Record<
  Exclude<SyncActivityKind, "downloading" | "preparing">,
  SymbolName
> = {
  changed: "checkmark.circle.fill",
  failed: "exclamationmark.triangle.fill",
  waiting: "icloud.slash",
  update: "arrow.down.circle.fill",
};

/** A spinner while preparing or downloading, otherwise the symbol of the activity. */
export function SyncActivityIcon({
  kind,
  size = 20,
}: {
  kind: SyncActivityKind;
  size?: number;
}) {
  const { colors } = useAppTheme();
  if (kind === "downloading" || kind === "preparing") {
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
