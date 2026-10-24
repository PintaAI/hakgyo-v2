import { joinMeanings } from "@hakgyo/shared";

export type VocabularyMatchWord = {
  id: string;
  term: string;
  meanings: string[];
};

export type VocabularyMatchCard = VocabularyMatchWord & {
  /** Every meaning joined, shown on the meaning card. */
  meaning: string;
};

export type VocabularyMatchRound = {
  terms: VocabularyMatchCard[];
  definitions: VocabularyMatchCard[];
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

function meaningKeys(word: VocabularyMatchWord) {
  return word.meanings.map((meaning) => meaning.toLocaleLowerCase());
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
    const meanings = [...new Set(word.meanings.map(clean).filter(Boolean))];
    return term && meanings.length > 0
      ? [{ ...word, term, meanings, meaning: joinMeanings(meanings) }]
      : [];
  });
  const selected = shuffled(playable, random).slice(
    0,
    Math.max(0, Math.floor(maximumWords)),
  );

  // Words sharing a meaning would make two meaning cards fit one term, so
  // each goes to the first round without such a word.
  const groups: VocabularyMatchCard[][] = [];
  for (const word of selected) {
    const keys = meaningKeys(word);
    const group = groups.find(
      (candidate) =>
        candidate.length < safeRoundSize &&
        candidate.every((other) =>
          meaningKeys(other).every((key) => !keys.includes(key)),
        ),
    );
    if (group) group.push(word);
    else groups.push([word]);
  }

  const rounds: VocabularyMatchRound[] = [];
  for (const group of groups) {
    const terms = shuffled(group, random);
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
