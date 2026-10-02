export function normalizePracticeAnswer(answer: string) {
  return answer.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function isPracticeAnswerCorrect(answer: string, expected: string) {
  const normalized = normalizePracticeAnswer(answer);
  return (
    normalized.length > 0 && normalized === normalizePracticeAnswer(expected)
  );
}

export function randomSeed() {
  return `${Date.now()}:${Math.random()}`;
}

export function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
