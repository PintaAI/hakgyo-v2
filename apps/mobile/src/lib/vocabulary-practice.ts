import { matchesTerm } from "@hakgyo/shared";

export type Word = {
  id: string;
  term: string;
  meanings: string[];
  imageAssetId?: string | null;
};

/** Typed or spoken Korean answer against the term (see `matchesTerm`). */
export function isVocabularyAnswerCorrect(answer: string, expected: string) {
  return matchesTerm(answer, expected);
}
