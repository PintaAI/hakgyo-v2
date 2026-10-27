import { formatScore, scoreBandResults, type ScoreBand } from "@hakgyo/shared";
import { Text, View } from "react-native";

import { SymbolIcon } from "./ui/symbol-icon";
import { useAppTheme } from "../providers/AppThemeProvider";

/** Which named thresholds ("Manufaktur" 60 %) a graded score reaches. Mirrors the web result. */
export function ScoreBandResults({
  score,
  maxScore,
  bands,
}: {
  score: number;
  maxScore: number;
  bands: readonly ScoreBand[];
}) {
  const { colors } = useAppTheme();
  if (!bands.length) return null;
  return (
    <View className="gap-2 self-stretch">
      {scoreBandResults(score, maxScore, bands).map((band) => (
        <View
          key={`${band.label}-${band.minPercent}`}
          className="flex-row items-center gap-2"
        >
          <SymbolIcon
            name={band.reached ? "checkmark.circle.fill" : "circle"}
            size={16}
            tintColor={band.reached ? colors.primary : colors.mutedForeground}
          />
          <Text
            className={`min-w-0 flex-1 text-sm ${band.reached ? "text-foreground" : "text-muted-foreground"}`}
          >
            {band.reached ? "Lolos batas" : "Belum lolos batas"} {band.label}
          </Text>
          <Text className="text-sm tabular-nums text-muted-foreground">
            {formatScore(band.minPercent)}%
          </Text>
        </View>
      ))}
    </View>
  );
}
