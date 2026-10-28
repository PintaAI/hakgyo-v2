type AssessmentResultContext = {
  attemptStatus: string;
  event: {
    type: "QUICK_ASSESSMENT" | "TRYOUT";
    status: string;
  } | null;
};

export function shouldRevealAssessmentAnswers({
  attemptStatus,
  event,
}: AssessmentResultContext) {
  if (attemptStatus !== "GRADED") return false;
  if (!event) return true;
  return event.type === "QUICK_ASSESSMENT" && event.status === "CLOSED";
}
