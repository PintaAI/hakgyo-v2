type AssessmentResultContext = {
  attemptStatus: string;
  event: {
    type: "QUICK_ASSESSMENT" | "TRYOUT";
    status: string;
  } | null;
  /** A Hakgyo package: answers show only after a Latihan closes, never after a standalone attempt. */
  contentLocked?: boolean;
};

export function shouldRevealAssessmentAnswers({
  attemptStatus,
  event,
  contentLocked = false,
}: AssessmentResultContext) {
  if (attemptStatus !== "GRADED") return false;
  if (!event) return !contentLocked;
  return event.type === "QUICK_ASSESSMENT" && event.status === "CLOSED";
}
