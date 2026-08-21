export type AssessmentQuestionForAnswering = {
  id: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "WRITTEN";
  optionIds: readonly string[];
};

export type AssessmentAnswerInput = {
  questionId: string;
  content?: unknown;
  optionIds: string[];
};

export function getMissingWrittenQuestionIds(
  questions: readonly AssessmentQuestionForAnswering[],
  answerQuestionIds: ReadonlySet<string>,
) {
  return questions
    .filter(
      (question) =>
        question.type === "WRITTEN" && !answerQuestionIds.has(question.id),
    )
    .map((question) => question.id);
}

export function groupScoresByValue(
  scores: readonly { answerId: string; score: number }[],
) {
  const groups = new Map<number, string[]>();
  for (const { answerId, score } of scores) {
    const answerIds = groups.get(score) ?? [];
    answerIds.push(answerId);
    groups.set(score, answerIds);
  }
  return groups;
}
