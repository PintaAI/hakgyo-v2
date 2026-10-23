import {
  HANGEUL_GAME_STAGES,
  type HangeulGameStage,
} from "@hakgyo/shared/hangeul";

import {
  HANGEUL_FAMILIES,
  HANGEUL_LETTERS,
  type HangeulFamily,
  type HangeulLetter,
} from "./hangeul-data";

export type HangeulFamilyGroup = {
  family: HangeulFamily;
  letters: HangeulLetter[];
};

/** What one run of the letter game teaches, quizzes and lists. */
export type HangeulLessonPlan = {
  stage?: HangeulGameStage;
  /** Letters taught in the learn steps (new in the stage). */
  newLetters: HangeulLetter[];
  /** Earlier letters mixed into the quiz as review. */
  reviewLetters: HangeulLetter[];
  /** Learn steps: families with only their new letters. */
  learnFamilies: HangeulFamilyGroup[];
  /** Cheat sheet: families with every letter the stage has taught so far. */
  sheetFamilies: HangeulFamilyGroup[];
  /** Every letter available in the stage; quiz distractors come from here. */
  pool: HangeulLetter[];
  /** Quiz order, by letter id. */
  quizIds: string[];
};

/** Review letters per new letter (at least two when earlier letters exist). */
const REVIEW_SHARE = 1 / 3;

function lettersFor(characters: readonly string[]) {
  const set = new Set(characters);
  return HANGEUL_LETTERS.filter((letter) => set.has(letter.character));
}

function groupByFamily(letters: readonly HangeulLetter[]) {
  const ids = new Set(letters.map((letter) => letter.id));
  return HANGEUL_FAMILIES.map((family) => ({
    family,
    letters: family.letterIds
      .filter((id) => ids.has(id))
      .map((id) => HANGEUL_LETTERS.find((letter) => letter.id === id)!),
  })).filter((group) => group.letters.length > 0);
}

/** Evenly spread picks, so review covers the whole earlier range. */
function spread<T>(items: readonly T[], count: number) {
  if (count >= items.length) return [...items];
  return Array.from(
    { length: count },
    (_, index) => items[Math.floor(((index + 0.5) * items.length) / count)]!,
  );
}

/** Places one review letter after every few new letters. */
function interleave(newIds: string[], reviewIds: string[]) {
  if (!reviewIds.length) return newIds;
  const every = Math.max(1, Math.ceil(newIds.length / reviewIds.length));
  const queue: string[] = [];
  let review = 0;
  newIds.forEach((id, index) => {
    queue.push(id);
    if ((index + 1) % every === 0 && review < reviewIds.length) {
      queue.push(reviewIds[review++]!);
    }
  });
  return [...queue, ...reviewIds.slice(review)];
}

/**
 * The letter game for a stage. Without a stage, and for `batchim` (which adds
 * no letters), it covers every letter. Otherwise it teaches the letters the
 * stage adds to the previous one and mixes a few earlier letters into the quiz.
 */
export function hangeulLessonPlan(stage?: HangeulGameStage): HangeulLessonPlan {
  const index = stage
    ? HANGEUL_GAME_STAGES.findIndex((entry) => entry.id === stage.id)
    : -1;
  if (!stage || index < 0 || stage.batchim) {
    return {
      stage,
      newLetters: HANGEUL_LETTERS,
      reviewLetters: [],
      learnFamilies: groupByFamily(HANGEUL_LETTERS),
      sheetFamilies: groupByFamily(HANGEUL_LETTERS),
      pool: HANGEUL_LETTERS,
      quizIds: HANGEUL_LETTERS.map((letter) => letter.id),
    };
  }

  const previous = HANGEUL_GAME_STAGES[index - 1];
  const earlier = new Set<string>(previous?.letters ?? []);
  const pool = lettersFor(stage.letters);
  const newLetters = pool.filter((letter) => !earlier.has(letter.character));
  const earlierLetters = pool.filter((letter) => earlier.has(letter.character));
  const reviewLetters = spread(
    earlierLetters,
    Math.min(
      earlierLetters.length,
      Math.max(2, Math.round(newLetters.length * REVIEW_SHARE)),
    ),
  );

  return {
    stage,
    newLetters,
    reviewLetters,
    learnFamilies: groupByFamily(newLetters),
    sheetFamilies: groupByFamily(pool),
    pool,
    quizIds: interleave(
      newLetters.map((letter) => letter.id),
      reviewLetters.map((letter) => letter.id),
    ),
  };
}
