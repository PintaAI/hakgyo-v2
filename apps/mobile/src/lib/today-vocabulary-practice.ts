export function normalizePracticeAnswer(answer: string) {
  return answer.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function isDefinitionCorrect(
  card: { definition: string },
  answer: string,
) {
  const normalized = normalizePracticeAnswer(answer);
  return (
    normalized.length > 0 &&
    normalized === normalizePracticeAnswer(card.definition)
  );
}
