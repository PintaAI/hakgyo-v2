export type QuestionStatus =
  "unanswered" | "answered" | "correct" | "incorrect";

export function isQuestionAnswered(answer?: {
  content?: string;
  optionIds: readonly string[];
}) {
  return Boolean(
    answer && (answer.optionIds.length > 0 || answer.content?.trim()),
  );
}

/** Wrap around so skipped questions before the current one are not missed. */
export function nextUnansweredQuestion(
  statuses: readonly QuestionStatus[],
  current: number,
) {
  for (let offset = 1; offset <= statuses.length; offset++) {
    const index = (current + offset) % statuses.length;
    if (statuses[index] === "unanswered") return index;
  }
  return -1;
}

/** Seconds as `m:ss`. */
export function formatRemaining(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
