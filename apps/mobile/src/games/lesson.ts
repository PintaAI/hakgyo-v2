import { createSentenceChallenges } from "./sentence-builder/engine";

/**
 * A game played as one round of a vocabulary lesson (`app/vocabulary/
 * [vocabularySetId]/lesson.tsx`): it starts at once with the lesson's words,
 * skips its own start and finish sheets, and hands over to the next round
 * when its words are done. Without it the game runs as in Latihan.
 */
export type GameLesson = {
  /** The header title in place of the game's own, e.g. "Babak 2 dari 4". */
  title: string;
  /** Every word of the round is answered and saved on the device. */
  onRoundComplete: () => void;
};

/** Words in one lesson: a short session, like one lesson in Duolingo. */
export const LESSON_WORD_COUNT = 5;

/**
 * The rounds in their order, each a game key: recognise the meaning, recall
 * the Korean word, use it in a sentence, then type it under time pressure.
 */
export type LessonRound = "match" | "cards" | "sentences" | "word-fall";

type LessonWord = {
  id: string;
  term: string;
  meanings: string[];
  examples?: unknown;
};

type WordProgress = { practiced: boolean; due: boolean; mastered: boolean };

function shuffled<T>(items: readonly T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}

/**
 * The lesson's words: new words first in the set's order (the order the
 * teacher wrote them in), then words due for review, then the rest with
 * mastered words last. Words without a term or a meaning are skipped.
 */
export function pickLessonWords<T extends LessonWord>(
  words: readonly T[],
  progress: ReadonlyMap<string, WordProgress>,
  random: () => number = Math.random,
  count = LESSON_WORD_COUNT,
): T[] {
  const usable = words.filter(
    (word) =>
      word.term.trim() && word.meanings.some((meaning) => meaning.trim()),
  );
  const fresh = usable.filter((word) => !progress.get(word.id)?.practiced);
  const due = usable.filter((word) => {
    const item = progress.get(word.id);
    return item?.practiced && item.due;
  });
  const rest = usable.filter((word) => {
    const item = progress.get(word.id);
    return item?.practiced && !item.due;
  });
  const learning = rest.filter((word) => !progress.get(word.id)?.mastered);
  const mastered = rest.filter((word) => progress.get(word.id)?.mastered);
  return [
    ...fresh,
    ...shuffled(due, random),
    ...shuffled(learning, random),
    ...shuffled(mastered, random),
  ].slice(0, count);
}

/** The rounds the words can be played in; a round they cannot fill is left out. */
export function lessonRounds(words: readonly LessonWord[]): LessonRound[] {
  if (words.length === 0) return [];
  return [
    ...(words.length >= 2 ? (["match"] as const) : []),
    "cards",
    ...(createSentenceChallenges(words).length > 0
      ? (["sentences"] as const)
      : []),
    "word-fall",
  ];
}
