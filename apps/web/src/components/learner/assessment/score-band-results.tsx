import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { formatScore, scoreBandResults, type ScoreBand } from "@hakgyo/shared";

import { cn } from "~/lib/utils";

/** Which named thresholds ("Manufaktur" 60 %) a graded score reaches. */
export function ScoreBandResults({
  score,
  maxScore,
  bands,
  className,
}: {
  score: number;
  maxScore: number;
  bands: readonly ScoreBand[];
  className?: string;
}) {
  if (!bands.length) return null;
  return (
    <ul className={cn("grid gap-1.5 text-sm", className)}>
      {scoreBandResults(score, maxScore, bands).map((band) => (
        <li
          key={`${band.label}-${band.minPercent}`}
          className={cn(
            "flex items-center gap-2",
            band.reached ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {band.reached ? (
            <CheckCircle2Icon className="text-primary size-4 shrink-0" />
          ) : (
            <CircleIcon className="size-4 shrink-0" />
          )}
          <span className="min-w-0 flex-1">
            {band.reached ? "Lolos batas" : "Belum lolos batas"} {band.label}
          </span>
          <span className="tabular-nums">{formatScore(band.minPercent)}%</span>
        </li>
      ))}
    </ul>
  );
}
