import type { ThemeColors } from "../theme/colors";
import { withOpacity } from "../theme/colors";
import type { QuestionStatus } from "./question-progress";

/**
 * A question's status colour, the same in every place that shows it (the
 * daily question dots, the question list): green once answered (or right),
 * red when graded wrong, amber when opened but not answered, grey when not
 * opened yet. The theme has no success or warning colour, so green and amber
 * are fixed; both read on light and dark backgrounds.
 */
export const QUESTION_DONE_COLOR = "#22c55e";
export const QUESTION_SEEN_COLOR = "#f59e0b";

export type QuestionTone = "done" | "wrong" | "seen" | "unseen";

export function questionTone(
  status: QuestionStatus,
  seen: boolean,
): QuestionTone {
  if (status === "answered" || status === "correct") return "done";
  if (status === "incorrect") return "wrong";
  return seen ? "seen" : "unseen";
}

export function questionToneColor(
  tone: QuestionTone,
  colors: Pick<ThemeColors, "destructive" | "mutedForeground">,
) {
  return tone === "done"
    ? QUESTION_DONE_COLOR
    : tone === "wrong"
      ? colors.destructive
      : tone === "seen"
        ? QUESTION_SEEN_COLOR
        : withOpacity(colors.mutedForeground, 0.35);
}
