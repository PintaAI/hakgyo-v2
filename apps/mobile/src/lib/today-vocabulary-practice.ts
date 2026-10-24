import { matchesMeaning } from "@hakgyo/shared";

export function normalizePracticeAnswer(answer: string) {
  return answer.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

/** Accepts any one meaning of the card, or all of them together. */
export function isDefinitionCorrect(
  card: { meanings: readonly string[] },
  answer: string,
) {
  return matchesMeaning(answer, card.meanings);
}
