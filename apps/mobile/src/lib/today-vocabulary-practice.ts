import { matchesMeaning } from "@hakgyo/shared";

/** Accepts any one meaning of the card, or all of them together. */
export function isDefinitionCorrect(
  card: { meanings: readonly string[] },
  answer: string,
) {
  return matchesMeaning(answer, card.meanings);
}
