import type { QuestionStatus } from "./question-progress";

/**
 * A question's status colour, the same in every place that shows it (the
 * status dots above the questions, the question list): green once answered
 * (or right), red when graded wrong, amber when opened but not answered, grey
 * when not opened yet. Mirrors the app's `question-colors.ts`. The theme has
 * no success or warning colour, so green and amber are fixed; both read on
 * light and dark backgrounds.
 */
export type QuestionTone = "done" | "wrong" | "seen" | "unseen";

export function questionTone(
  status: QuestionStatus,
  seen: boolean,
): QuestionTone {
  if (status === "answered" || status === "correct") return "done";
  if (status === "incorrect") return "wrong";
  return seen ? "seen" : "unseen";
}

/** A solid fill in the tone's colour (dots, segments). */
export const questionToneFill: Record<QuestionTone, string> = {
  done: "bg-[#22c55e]",
  wrong: "bg-destructive",
  seen: "bg-[#f59e0b]",
  unseen: "bg-muted-foreground/35",
};

/** A soft wash of the tone's colour with its number in that colour (list tiles). */
export const questionToneTile: Record<QuestionTone, string> = {
  done: "border-[#22c55e]/45 bg-[#22c55e]/14 text-[#22c55e]",
  wrong: "border-destructive/45 bg-destructive/14 text-destructive",
  seen: "border-[#f59e0b]/45 bg-[#f59e0b]/14 text-[#f59e0b]",
  unseen: "border-border bg-card text-foreground",
};
