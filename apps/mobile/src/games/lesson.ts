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
const LESSON_WORD_COUNT = 5;

/**
 * The rounds, each a game key: recognise the meaning, recall the Korean
 * word, use it in a sentence, then type it under time pressure. The middle
 * two take turns (see `lessonRounds`), so lessons don't play the same way.
 */
export type LessonRound = "match" | "cards" | "sentences" | "word-fall";

type LessonWord = {
  id: string;
  term: string;
  meanings: string[];
  examples?: unknown;
};

type WordProgress = {
  practiced: boolean;
  due: boolean;
  mastered: boolean;
  /** Recalled right at least once; absent from older servers. */
  learned?: boolean;
};

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
 * teacher wrote them in), then words practised but not yet learned ("Perlu
 * dihafal": never recalled right, which the set needs to complete), then
 * words due for review, then the rest with mastered words last. Words
 * without a term or a meaning are skipped.
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
  const practiced = usable.filter((word) => progress.get(word.id)?.practiced);
  // `learned` is absent from older servers: then nothing counts as unlearned.
  const unlearned = practiced.filter(
    (word) => progress.get(word.id)?.learned === false,
  );
  const others = practiced.filter(
    (word) => progress.get(word.id)?.learned !== false,
  );
  const due = others.filter((word) => progress.get(word.id)?.due);
  const rest = others.filter((word) => !progress.get(word.id)?.due);
  const learning = rest.filter((word) => !progress.get(word.id)?.mastered);
  const mastered = rest.filter((word) => progress.get(word.id)?.mastered);
  return [
    ...fresh,
    ...shuffled(unlearned, random),
    ...shuffled(due, random),
    ...shuffled(learning, random),
    ...shuffled(mastered, random),
  ].slice(0, count);
}

/**
 * The rounds of a lesson, so it ramps up without playing the same way every
 * time:
 * - Cocokkan (recognising) opens it, unless every word is already learned:
 *   then recognising is too easy and the lesson starts at recall.
 * - Kartu and Susun makna come next, in either order.
 * - Hujan Kata (typing under time) always closes it.
 * A round the words cannot fill is left out (matching needs two words, a
 * sentence round needs examples).
 */
export function lessonRounds(
  words: readonly LessonWord[],
  {
    progress,
    random = Math.random,
  }: {
    progress?: ReadonlyMap<string, WordProgress>;
    random?: () => number;
  } = {},
): LessonRound[] {
  if (words.length === 0) return [];
  const allLearned =
    !!progress &&
    words.every((word) => {
      const item = progress.get(word.id);
      return !!item && (item.learned === true || item.mastered);
    });
  const middle: LessonRound[] = [
    "cards",
    ...(createSentenceChallenges(words).length > 0
      ? (["sentences"] as const)
      : []),
  ];
  return [
    ...(words.length >= 2 && !allLearned ? (["match"] as const) : []),
    ...shuffled(middle, random),
    "word-fall",
  ];
}
