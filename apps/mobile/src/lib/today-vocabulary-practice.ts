export const PRACTICED_STREAK_REQUIRED = 3;

export type TodayVocabularyCard = {
  entryId: string;
  term: string;
  definition: string;
  vocabularySetId: string;
  setEntryCount: number;
  setVersion: string;
};

type PracticeEntryMemory = {
  setId: string;
  setVersion: string;
  fingerprint: string;
  correctStreak: number;
  reviewCount: number;
  dueAt: number;
};

export type TodayVocabularyMemory = {
  version: 1;
  entries: Record<string, PracticeEntryMemory>;
};

export function emptyTodayVocabularyMemory(): TodayVocabularyMemory {
  return { version: 1, entries: {} };
}

export function vocabularyCardFingerprint(card: TodayVocabularyCard) {
  return JSON.stringify([card.term, card.definition]);
}

export function normalizePracticeAnswer(answer: string) {
  return answer.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function isDefinitionCorrect(card: TodayVocabularyCard, answer: string) {
  const normalized = normalizePracticeAnswer(answer);
  return (
    normalized.length > 0 &&
    normalized === normalizePracticeAnswer(card.definition)
  );
}

export function practiceMemoryFor(
  card: TodayVocabularyCard,
  memory: TodayVocabularyMemory,
) {
  const saved = memory.entries[card.entryId];
  return saved?.setId === card.vocabularySetId &&
    saved.setVersion === card.setVersion &&
    saved.fingerprint === vocabularyCardFingerprint(card)
    ? saved
    : undefined;
}

export function recordTodayVocabularyRecall(
  memory: TodayVocabularyMemory,
  card: TodayVocabularyCard,
  correct: boolean,
  now: number,
): TodayVocabularyMemory {
  const previous = practiceMemoryFor(card, memory);
  const correctStreak = correct ? (previous?.correctStreak ?? 0) + 1 : 0;
  const interval = correct
    ? Math.min(30, 2 ** Math.min(correctStreak - 1, 5)) * 86_400_000
    : 10 * 60_000;
  const entries = Object.fromEntries(
    Object.entries(memory.entries).filter(
      ([, saved]) =>
        saved.setId !== card.vocabularySetId ||
        saved.setVersion === card.setVersion,
    ),
  );

  entries[card.entryId] = {
    setId: card.vocabularySetId,
    setVersion: card.setVersion,
    fingerprint: vocabularyCardFingerprint(card),
    correctStreak,
    reviewCount: (previous?.reviewCount ?? 0) + 1,
    dueAt: now + interval,
  };

  return { version: 1, entries };
}

export function isVocabularySetPracticed(
  card: TodayVocabularyCard,
  memory: TodayVocabularyMemory,
) {
  if (card.setEntryCount < 1) return false;
  const practiced = Object.values(memory.entries).filter(
    (saved) =>
      saved.setId === card.vocabularySetId &&
      saved.setVersion === card.setVersion &&
      saved.correctStreak >= PRACTICED_STREAK_REQUIRED,
  ).length;
  return practiced >= card.setEntryCount;
}

export function buildTodayVocabularyQueue<T extends TodayVocabularyCard>(
  cards: readonly T[],
  memory: TodayVocabularyMemory,
  now: number,
) {
  const due = cards.filter((card) => {
    const saved = practiceMemoryFor(card, memory);
    return !saved || saved.dueAt <= now;
  });
  return {
    cards: due.length ? due : [...cards],
    extraPractice: due.length === 0,
  };
}

export function parseTodayVocabularyMemory(
  raw: string | null,
): TodayVocabularyMemory {
  if (!raw) return emptyTodayVocabularyMemory();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return emptyTodayVocabularyMemory();
    }
    const candidate = parsed as Partial<TodayVocabularyMemory>;
    if (
      candidate.version !== 1 ||
      !candidate.entries ||
      typeof candidate.entries !== "object" ||
      Array.isArray(candidate.entries)
    ) {
      return emptyTodayVocabularyMemory();
    }
    const entries = Object.fromEntries(
      Object.entries(candidate.entries).filter(([, value]) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          return false;
        }
        const item = value as Partial<PracticeEntryMemory>;
        return (
          typeof item.setId === "string" &&
          typeof item.setVersion === "string" &&
          typeof item.fingerprint === "string" &&
          Number.isInteger(item.correctStreak) &&
          (item.correctStreak ?? -1) >= 0 &&
          Number.isInteger(item.reviewCount) &&
          (item.reviewCount ?? -1) >= (item.correctStreak ?? 0) &&
          typeof item.dueAt === "number" &&
          Number.isFinite(item.dueAt) &&
          item.dueAt >= 0
        );
      }),
    );
    return { version: 1, entries };
  } catch {
    return emptyTodayVocabularyMemory();
  }
}
