export function normalizePracticeAnswer(answer: string) {
  return answer.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function isPracticeAnswerCorrect(answer: string, expected: string) {
  const normalized = normalizePracticeAnswer(answer);
  return (
    normalized.length > 0 && normalized === normalizePracticeAnswer(expected)
  );
}

/** Cards in one round of the Today page's vocabulary practice. */
export const TODAY_VOCABULARY_ROUND_SIZE = 24;
/** Questions in one round of the Today page's assessment practice. */
export const TODAY_ASSESSMENT_QUESTION_COUNT = 5;

export function randomSeed() {
  return `${Date.now()}:${Math.random()}`;
}

export function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
