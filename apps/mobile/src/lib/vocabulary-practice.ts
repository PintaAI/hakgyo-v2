export type Word = { id: string; term: string; definition: string };
export type Memory = {
  correct: number;
  reviews: number;
  dueAt: number;
  fingerprint: string;
};
export type PracticeMemory = Record<string, Memory>;

export function fingerprint(word: Word) {
  return JSON.stringify([word.term, word.definition]);
}

export function memoryFor(word: Word, memory: PracticeMemory) {
  const item = memory[word.id];
  return item?.fingerprint === fingerprint(word) ? item : undefined;
}

export function parseMemory(raw: string | null): PracticeMemory {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => {
        if (!value || typeof value !== "object") return false;
        const item = value as Partial<Memory>;
        return (
          typeof item.fingerprint === "string" &&
          typeof item.correct === "number" &&
          Number.isInteger(item.correct) &&
          item.correct >= 0 &&
          typeof item.reviews === "number" &&
          Number.isInteger(item.reviews) &&
          item.reviews >= item.correct &&
          typeof item.dueAt === "number" &&
          Number.isFinite(item.dueAt) &&
          item.dueAt >= 0
        );
      }),
    );
  } catch {
    return {};
  }
}

export function buildSession(
  words: readonly Word[],
  memory: PracticeMemory,
  now: number,
  limit = 10,
) {
  return words
    .filter((word) => word.term.trim() && word.definition.trim())
    .filter(
      (word) =>
        !memoryFor(word, memory) || memoryFor(word, memory)!.dueAt <= now,
    )
    .sort(
      (a, b) =>
        (memoryFor(a, memory)?.dueAt ?? 0) -
          (memoryFor(b, memory)?.dueAt ?? 0) || a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}

export function recordRecall(
  memory: PracticeMemory,
  word: Word,
  recalled: boolean,
  now: number,
): PracticeMemory {
  const previous = memoryFor(word, memory);
  const correct = recalled ? (previous?.correct ?? 0) + 1 : 0;
  const interval = recalled
    ? Math.min(30, 2 ** Math.min(correct - 1, 5)) * 86_400_000
    : 600_000;
  return {
    ...memory,
    [word.id]: {
      correct,
      reviews: (previous?.reviews ?? 0) + 1,
      dueAt: now + interval,
      fingerprint: fingerprint(word),
    },
  };
}

export function choiceOptions(
  word: Word,
  words: readonly Word[],
  reverse: boolean,
  random = Math.random,
) {
  const answer = reverse ? word.term : word.definition;
  const pool = [
    ...new Set(words.map((item) => (reverse ? item.term : item.definition))),
  ].filter((value) => value.trim() && value !== answer);
  function shuffle(values: string[]) {
    for (let index = values.length - 1; index > 0; index--) {
      const target = Math.floor(random() * (index + 1));
      [values[index], values[target]] = [values[target]!, values[index]!];
    }
    return values;
  }
  return shuffle([answer, ...shuffle(pool).slice(0, 3)]);
}
