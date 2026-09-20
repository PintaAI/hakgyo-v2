export type VocabularyMatchWord = {
  id: string;
  term: string;
  definition: string;
};

export type VocabularyMatchRound = {
  terms: VocabularyMatchWord[];
  definitions: VocabularyMatchWord[];
};

export type VocabularyMatchSession = {
  rounds: VocabularyMatchRound[];
  wordCount: number;
};

function shuffled<T>(values: readonly T[], random: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

function clean(value: string) {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

export function createVocabularyMatchSession(
  words: readonly VocabularyMatchWord[],
  random: () => number = Math.random,
  maximumWords = 10,
  roundSize = 5,
): VocabularyMatchSession {
  const safeRoundSize = Math.max(1, Math.floor(roundSize));
  const seen = new Set<string>();
  const playable = words.flatMap((word) => {
    if (seen.has(word.id)) return [];
    seen.add(word.id);
    const term = clean(word.term);
    const definition = clean(word.definition);
    return term && definition ? [{ ...word, term, definition }] : [];
  });
  const selected = shuffled(playable, random).slice(
    0,
    Math.max(0, Math.floor(maximumWords)),
  );
  const rounds: VocabularyMatchRound[] = [];

  for (let offset = 0; offset < selected.length; offset += safeRoundSize) {
    const terms = shuffled(
      selected.slice(offset, offset + safeRoundSize),
      random,
    );
    if (terms.length === 0) continue;
    if (terms.length === 1) {
      rounds.push({ terms, definitions: [...terms] });
      continue;
    }
    // A random non-zero rotation gives every row a different answer while
    // avoiding retry loops and preserving deterministic tests.
    const shift = 1 + Math.floor(random() * (terms.length - 1));
    const definitions = terms.map(
      (_, index) => terms[(index + shift) % terms.length]!,
    );
    rounds.push({ terms, definitions });
  }

  return { rounds, wordCount: selected.length };
}

export function isVocabularyMatch(termId: string, definitionId: string) {
  return termId === definitionId;
}

export function pointsForVocabularyMatch(streak: number) {
  return 100 + Math.min(10, Math.max(0, Math.floor(streak) - 1)) * 20;
}

export function vocabularyMatchResult(hadMistake: boolean) {
  return hadMistake ? ("INCORRECT" as const) : ("CORRECT" as const);
}
