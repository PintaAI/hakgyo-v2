export type SentenceSourceWord = {
  id: string;
  term: string;
  definition: string;
  examples?: unknown;
};

export type SentenceChallenge = {
  id: string;
  entryId: string;
  term: string;
  definition: string;
  sentence: string;
  words: readonly string[];
  tiles: readonly string[];
};

export type SentenceBuilderSession = {
  phase: "intro" | "playing" | "correct" | "complete";
  challenges: readonly SentenceChallenge[];
  index: number;
  selected: number[];
  feedback: "idle" | "incorrect";
  showHint: boolean;
  mistakes: number;
  independent: number;
  reviewIds: readonly string[];
};

export type SentenceBuilderAction =
  | { type: "start"; challenges: readonly SentenceChallenge[] }
  | { type: "clear" | "hint" | "next" }
  | { type: "add" | "remove"; tileIndex: number };

const MIN_WORDS = 2;
const MAX_WORDS = 10;
const TRAILING_PUNCTUATION = /[.?!。？！…~]+$/u;

export const initialSentenceBuilderSession: SentenceBuilderSession = {
  phase: "intro",
  challenges: [],
  index: 0,
  selected: [],
  feedback: "idle",
  showHint: false,
  mistakes: 0,
  independent: 0,
  reviewIds: [],
};

function clean(value: string) {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

function shuffled<T>(values: readonly T[], random: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

/** Reads the example sentences stored on a vocabulary entry. */
export function exampleSentences(examples: unknown): string[] {
  const values = Array.isArray(examples)
    ? examples
    : typeof examples === "string"
      ? examples.split("\n")
      : [];
  return values.flatMap((value) => {
    if (typeof value !== "string") return [];
    const sentence = clean(value);
    return sentence ? [sentence] : [];
  });
}

/**
 * Splits a sentence into word tiles. Final punctuation is dropped so the last
 * tile does not give the answer away; it returns with the full sentence.
 */
export function sentenceWords(sentence: string) {
  return clean(sentence.replace(TRAILING_PUNCTUATION, ""))
    .split(" ")
    .filter(Boolean);
}

function scrambled(words: readonly string[], random: () => number) {
  if (new Set(words).size < 2) return [...words];
  const same = (tiles: readonly string[]) =>
    tiles.every((word, index) => word === words[index]);
  let tiles = shuffled(words, random);
  // Rotating a still-ordered shuffle guarantees the tray never starts solved.
  for (let shift = 1; same(tiles) && shift < words.length; shift += 1)
    tiles = words.map((_, index) => words[(index + shift) % words.length]!);
  return tiles;
}

/**
 * Builds a practice round from vocabulary example sentences, taking one
 * sentence per entry at a time so a round covers as many words as possible.
 */
export function createSentenceChallenges(
  words: readonly SentenceSourceWord[],
  random: () => number = Math.random,
  maximumSentences = 8,
): SentenceChallenge[] {
  const seenSentences = new Set<string>();
  const seenEntries = new Set<string>();
  const pools = shuffled(words, random).flatMap((word) => {
    if (seenEntries.has(word.id)) return [];
    seenEntries.add(word.id);
    const term = clean(word.term);
    const definition = clean(word.definition);
    const sentences = exampleSentences(word.examples).filter((sentence) => {
      const count = sentenceWords(sentence).length;
      if (count < MIN_WORDS || count > MAX_WORDS) return false;
      if (seenSentences.has(sentence)) return false;
      seenSentences.add(sentence);
      return true;
    });
    return sentences.length > 0
      ? [{ word, term, definition, sentences: shuffled(sentences, random) }]
      : [];
  });

  const limit = Math.max(0, Math.floor(maximumSentences));
  const challenges: SentenceChallenge[] = [];
  for (let depth = 0; challenges.length < limit; depth += 1) {
    const layer = pools.filter((pool) => depth < pool.sentences.length);
    if (layer.length === 0) break;
    for (const pool of layer) {
      if (challenges.length >= limit) break;
      const sentence = pool.sentences[depth]!;
      const sentenceTiles = sentenceWords(sentence);
      challenges.push({
        id: `${pool.word.id}:${depth}`,
        entryId: pool.word.id,
        term: pool.term,
        definition: pool.definition,
        sentence,
        words: sentenceTiles,
        tiles: scrambled(sentenceTiles, random),
      });
    }
  }
  return challenges;
}

export function sentenceAttemptResult(
  session: Pick<SentenceBuilderSession, "mistakes" | "showHint">,
) {
  return session.mistakes === 0 && !session.showHint
    ? ("CORRECT" as const)
    : ("INCORRECT" as const);
}

/** The next answer position that is wrong or empty, with a free tile for it. */
export function sentenceHint(
  challenge: SentenceChallenge,
  selected: readonly number[],
) {
  const position = challenge.words.findIndex(
    (word, index) => challenge.tiles[selected[index] ?? -1] !== word,
  );
  if (position < 0) return null;
  const word = challenge.words[position]!;
  const tileIndex = challenge.tiles.findIndex(
    (tile, index) => tile === word && !selected.includes(index),
  );
  return { position, word, tileIndex };
}

export function sentenceBuilderReducer(
  state: SentenceBuilderSession,
  action: SentenceBuilderAction,
): SentenceBuilderSession {
  if (action.type === "start") {
    if (action.challenges.length === 0) return state;
    return {
      ...initialSentenceBuilderSession,
      phase: "playing",
      challenges: action.challenges,
    };
  }

  if (action.type === "next") {
    if (state.phase !== "correct") return state;
    if (state.index >= state.challenges.length - 1)
      return { ...state, phase: "complete" };
    return {
      ...state,
      phase: "playing",
      index: state.index + 1,
      selected: [],
      feedback: "idle",
      showHint: false,
      mistakes: 0,
    };
  }

  if (state.phase !== "playing") return state;
  const challenge = state.challenges[state.index];
  if (!challenge) return state;

  switch (action.type) {
    case "add": {
      if (
        action.tileIndex < 0 ||
        action.tileIndex >= challenge.tiles.length ||
        state.selected.includes(action.tileIndex) ||
        state.selected.length >= challenge.words.length
      )
        return state;
      const selected = [...state.selected, action.tileIndex];
      if (selected.length < challenge.words.length)
        return { ...state, selected, feedback: "idle" };
      // Compare text rather than tile identity so repeated words can swap.
      const correct = selected.every(
        (tileIndex, index) =>
          challenge.tiles[tileIndex] === challenge.words[index],
      );
      if (correct) {
        const independent = sentenceAttemptResult(state) === "CORRECT";
        return {
          ...state,
          selected,
          phase: "correct",
          feedback: "idle",
          independent: state.independent + (independent ? 1 : 0),
          reviewIds: independent
            ? state.reviewIds
            : [...state.reviewIds, challenge.id],
        };
      }
      return {
        ...state,
        selected,
        feedback: "incorrect",
        mistakes: state.mistakes + 1,
      };
    }
    case "remove":
      return {
        ...state,
        selected: state.selected.filter((tile) => tile !== action.tileIndex),
        feedback: "idle",
      };
    case "clear":
      return { ...state, selected: [], feedback: "idle" };
    case "hint":
      return { ...state, showHint: true };
  }
}
