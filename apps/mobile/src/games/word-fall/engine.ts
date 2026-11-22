import { displayMeanings, typeableAnswers } from "@hakgyo/shared";

export type WordFallWord = {
  id: string;
  term: string;
  /** Every meaning; typing any one of them in "ID" mode clears the word. */
  meanings: string[];
};

export type WordFallAnswerMode = "ID" | "KR";

export type WordFallPowerUp =
  "shield" | "freeze" | "heart" | "reveal" | "force";

export type WordFallReviewReason = "missed" | "mistyped";

export type WordFallReviewItem = {
  word: WordFallWord;
  reasons: WordFallReviewReason[];
};

export function addWordFallReviewItem(
  current: readonly WordFallReviewItem[],
  word: WordFallWord,
  reason: WordFallReviewReason,
) {
  const existingIndex = current.findIndex((item) => item.word.id === word.id);
  if (existingIndex < 0) return [...current, { word, reasons: [reason] }];

  const existing = current[existingIndex]!;
  if (existing.reasons.includes(reason)) return current;
  return current.map((item, index) =>
    index === existingIndex
      ? { ...item, reasons: [...item.reasons, reason] }
      : item,
  );
}

export type TypingAnalysis = {
  correctCharacters: number;
  gainedCharacters: number;
  completed: boolean;
  mistake: boolean;
  composing: boolean;
};

export type WordFallPhase = "ready" | "running" | "paused" | "gameover";

export function isWordFallInputEditable(phase: WordFallPhase) {
  return phase === "running";
}

/**
 * Every text the learner may type to clear the word, the one to show
 * first leading: notes in brackets, the other side of a slash and punctuation are
 * not typed (see `typeableAnswers`), as other games accept answers without
 * them. A word with nothing typeable keeps its text as written.
 */
export function answerOptionsForWord(
  word: WordFallWord,
  mode: WordFallAnswerMode = "ID",
) {
  const written = mode === "KR" ? [word.term] : word.meanings;
  const options = [...new Set(written.flatMap(typeableAnswers))];
  return options.length > 0 ? options : written;
}

/** The answer shown before the learner starts typing: the first meaning. */
export function answerTextForWord(
  word: WordFallWord,
  mode: WordFallAnswerMode = "ID",
) {
  return answerOptionsForWord(word, mode)[0] ?? "";
}

export function promptTextForWord(
  word: WordFallWord,
  mode: WordFallAnswerMode,
) {
  return mode === "KR" ? displayMeanings(word.meanings) : word.term;
}

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const JUNGSEONG_COUNT = 21;
const JONGSEONG_COUNT = 28;

const INITIAL_COMPATIBILITY_JAMO = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

const COMPOUND_VOWEL_PREFIX = new Map([
  [9, 8], // ㅘ starts as ㅗ
  [10, 8], // ㅙ starts as ㅗ
  [11, 8], // ㅚ starts as ㅗ
  [14, 13], // ㅝ starts as ㅜ
  [15, 13], // ㅞ starts as ㅜ
  [16, 13], // ㅟ starts as ㅜ
  [19, 18], // ㅢ starts as ㅡ
]);

export function cleanTypingText(value: string) {
  return (
    value
      // NFC preserves compatibility jamo emitted while Korean IMEs compose a
      // syllable; NFKC would rewrite them before we can recognize that state.
      .normalize("NFC")
      .replace(/\p{Cf}/gu, "")
      .replace(/[\u2018\u2019\u02bc]/gu, "'")
      .replace(/[\u2010-\u2015\u2212]/gu, "-")
      .replace(/\s+/gu, " ")
      .trim()
  );
}

export function normalizeTypingText(value: string) {
  return cleanTypingText(value).toLocaleLowerCase();
}

function characters(value: string) {
  return Array.from(normalizeTypingText(value));
}

function hangulParts(value: string) {
  const code = value.codePointAt(0);
  if (code === undefined || code < HANGUL_BASE || code > HANGUL_END)
    return null;
  const offset = code - HANGUL_BASE;
  return {
    initial: Math.floor(offset / (JUNGSEONG_COUNT * JONGSEONG_COUNT)),
    vowel: Math.floor((offset % (JUNGSEONG_COUNT * JONGSEONG_COUNT)) / 28),
    final: offset % JONGSEONG_COUNT,
  };
}

function isHangulCompositionPrefix(expected: string, actual: string) {
  const expectedParts = hangulParts(expected);
  if (!expectedParts) return false;

  const initialIndex = INITIAL_COMPATIBILITY_JAMO.indexOf(
    actual as (typeof INITIAL_COMPATIBILITY_JAMO)[number],
  );
  if (initialIndex >= 0) return initialIndex === expectedParts.initial;

  const actualParts = hangulParts(actual);
  if (!actualParts || actualParts.initial !== expectedParts.initial)
    return false;
  const vowelMatches =
    actualParts.vowel === expectedParts.vowel ||
    COMPOUND_VOWEL_PREFIX.get(expectedParts.vowel) === actualParts.vowel;
  if (!vowelMatches) return false;
  return actualParts.final === 0 && expectedParts.final !== 0;
}

export function analyzeTyping(
  term: string,
  input: string,
  previousCorrectCharacters: number,
): TypingAnalysis {
  const expected = characters(term);
  const actual = characters(input);
  let correctCharacters = 0;

  while (
    correctCharacters < expected.length &&
    actual[correctCharacters] === expected[correctCharacters]
  ) {
    correctCharacters += 1;
  }

  const composing =
    actual.length === correctCharacters + 1 &&
    correctCharacters < expected.length &&
    isHangulCompositionPrefix(
      expected[correctCharacters]!,
      actual[correctCharacters]!,
    );
  const completed =
    expected.length > 0 &&
    correctCharacters === expected.length &&
    actual.length === expected.length;

  return {
    correctCharacters,
    gainedCharacters: Math.max(
      0,
      correctCharacters - previousCorrectCharacters,
    ),
    completed,
    mistake: !completed && actual.length > correctCharacters && !composing,
    composing,
  };
}

/**
 * The answer the input is heading towards: the option with the longest
 * matching prefix, a completed one first. Ties keep `current`, so typing does
 * not make the shown answer jump between meanings.
 */
export function bestTypingAnswer(
  options: readonly string[],
  input: string,
  current?: string,
) {
  let best =
    current !== undefined && options.includes(current)
      ? current
      : (options[0] ?? "");
  let bestAnalysis = analyzeTyping(best, input, 0);
  for (const option of options) {
    const analysis = analyzeTyping(option, input, 0);
    const better =
      (analysis.completed && !bestAnalysis.completed) ||
      (analysis.completed === bestAnalysis.completed &&
        analysis.correctCharacters + (analysis.composing ? 0.5 : 0) >
          bestAnalysis.correctCharacters + (bestAnalysis.composing ? 0.5 : 0));
    if (better) {
      best = option;
      bestAnalysis = analysis;
    }
  }
  return best;
}

export type TypingTargetCandidate = {
  id: string;
  answer: string;
  /** How far the word is from the ship; the nearest match is the target. */
  distance: number;
};

export function selectWordTarget(
  candidates: readonly TypingTargetCandidate[],
  input: string,
) {
  if (!normalizeTypingText(input)) return undefined;
  return candidates.reduce<TypingTargetCandidate | undefined>(
    (selected, candidate) => {
      const analysis = analyzeTyping(candidate.answer, input, 0);
      const matches =
        analysis.completed ||
        analysis.correctCharacters > 0 ||
        analysis.composing;
      if (!matches) return selected;
      return !selected || candidate.distance < selected.distance
        ? candidate
        : selected;
    },
    undefined,
  )?.id;
}

export function levelForDestroyed(destroyed: number) {
  return 1 + Math.floor(Math.max(0, destroyed) / 6);
}

export function destroyedForLevel(level: number) {
  return Math.max(0, Math.floor(level) - 1) * 6;
}

export function maximumActiveWords(level: number) {
  return Math.min(5, 1 + Math.floor((Math.max(1, level) - 1) / 2));
}

export function spawnIntervalForLevel(level: number) {
  return Math.max(650, 1_500 - Math.max(1, level) * 70);
}

export function fallDurationForLevel(level: number, random = Math.random()) {
  const base = Math.max(5_000, 31_000 - Math.max(1, level) * 1_000);
  return Math.round(base * (0.95 + random * 0.1));
}

/**
 * The impulse of one shot, in px/s given to a word of mass 1 (see
 * `knockBack` in `physics.ts`). A plain shot stops a falling word and lifts
 * it a little, a bit harder at higher levels where words fall faster; a
 * Force shot throws it back.
 */
export function shotImpulseForLevel(level: number, powered: boolean) {
  if (powered) return 240;
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.min(95, 60 + (safeLevel - 1) * 3);
}

export function comboMultiplier(combo: number) {
  return Math.min(3, 1 + Math.max(0, Math.floor(combo) - 1) * 0.1);
}

/** Points for clearing a word by typing `answer` (a meaning, or the Korean term in KR mode). */
export function pointsForWord(answer: string, level: number, combo = 1) {
  const basePoints =
    Math.max(1, Array.from(answer).length) * 10 * Math.max(1, level);
  return Math.round(basePoints * comboMultiplier(combo));
}

/** A destroyed word's blast at combo 1: its reach in px and its push at the centre in px/s. */
const BLAST_RADIUS = 130;
const BLAST_STRENGTH = 320;
/** Each combo step past the first adds this share, up to `MAX_BLAST_SCALE`. */
const BLAST_SCALE_PER_COMBO = 0.06;
const MAX_BLAST_SCALE = 1.6;
/** From this combo on, a blast is big: the screen shakes. */
const BIG_BLAST_COMBO = 5;

/**
 * The blast of a word destroyed at `combo`: a streak makes it reach further
 * and push harder, so the combo shows on the field. A word carrying a
 * power-up always blasts big.
 */
export function blastForCombo(combo = 1, powerUp = false) {
  const scale = Math.min(
    MAX_BLAST_SCALE,
    1 + Math.max(0, Math.floor(combo) - 1) * BLAST_SCALE_PER_COMBO,
  );
  return {
    radius: BLAST_RADIUS * scale,
    strength: BLAST_STRENGTH * scale,
    big: powerUp || combo >= BIG_BLAST_COMBO,
  };
}

/**
 * The blast of a word that reaches the ship: wider and harder than a word's
 * own, so the words right behind it are thrown back up.
 */
export const SHIP_BLAST = { radius: 180, strength: 460 };

export function wordFallResult(hadMistake: boolean) {
  return hadMistake ? ("INCORRECT" as const) : ("CORRECT" as const);
}
