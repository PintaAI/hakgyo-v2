export type WordFallWord = {
  id: string;
  term: string;
  definition: string;
};

export type WordFallPowerUp = "shield" | "freeze" | "heart" | "blast" | "force";

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

export function answerTextForWord(word: WordFallWord) {
  return word.definition;
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

export type TypingTargetCandidate = {
  id: string;
  answer: string;
  impactAt: number;
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
      return !selected || candidate.impactAt < selected.impactAt
        ? candidate
        : selected;
    },
    undefined,
  )?.id;
}

export function levelForDestroyed(destroyed: number) {
  return 1 + Math.floor(Math.max(0, destroyed) / 6);
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

export function pushStrengthForLevel(level: number, powered: boolean) {
  if (powered) return 30;
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.min(8, 4 + Math.floor((safeLevel - 1) / 3));
}

export function knockbackDelayMs(
  fallDuration: number,
  pathDistance: number,
  pushDistance: number,
) {
  return (
    Math.max(0, fallDuration) *
    (Math.max(0, pushDistance) / Math.max(1, pathDistance))
  );
}

export function comboMultiplier(combo: number) {
  return Math.min(3, 1 + Math.max(0, Math.floor(combo) - 1) * 0.1);
}

export function pointsForWord(word: WordFallWord, level: number, combo = 1) {
  const basePoints =
    Math.max(1, Array.from(answerTextForWord(word)).length) *
    10 *
    Math.max(1, level);
  return Math.round(basePoints * comboMultiplier(combo));
}

export function wordFallResult(hadMistake: boolean) {
  return hadMistake ? ("INCORRECT" as const) : ("CORRECT" as const);
}

export function maskedDefinition(definition: string, revealed: number) {
  return Array.from(definition)
    .map((character, index) =>
      character.trim() === "" || index < revealed ? character : "•",
    )
    .join("");
}
