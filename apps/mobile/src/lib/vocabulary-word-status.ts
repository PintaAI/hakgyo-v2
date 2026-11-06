/**
 * Where a learner stands with one word of a vocabulary set, from its saved
 * progress (`learning.getVocabularyProgress`):
 *
 * - NEW: never practised.
 * - MEMORIZE: practised, but never recalled correctly yet (only recognised,
 *   or answered wrong).
 * - LEARNED: recalled correctly at least once. A set completes in its course
 *   once every word is learned.
 * - MASTERED: recalled correctly twice, a day apart.
 */
export type VocabularyWordStatus = "NEW" | "MEMORIZE" | "LEARNED" | "MASTERED";

export type VocabularyWordProgress = {
  practiced: boolean;
  /** Absent in answers from servers older than the "learned" rule. */
  learned?: boolean;
  mastered: boolean;
  due: boolean;
};

export function vocabularyWordStatus(
  progress: VocabularyWordProgress | undefined,
): VocabularyWordStatus {
  if (!progress?.practiced) return "NEW";
  if (progress.mastered) return "MASTERED";
  if (progress.learned) return "LEARNED";
  return "MEMORIZE";
}

export const vocabularyWordStatusLabels: Record<VocabularyWordStatus, string> =
  {
    NEW: "Baru",
    MEMORIZE: "Perlu dihafal",
    LEARNED: "Dipelajari",
    MASTERED: "Dikuasai",
  };

/** Words still to memorise first (their own order kept), the known ones after. */
const ORDER: Record<VocabularyWordStatus, number> = {
  MEMORIZE: 0,
  NEW: 1,
  LEARNED: 2,
  MASTERED: 3,
};

export function sortByWordStatus<T extends { id: string }>(
  words: readonly T[],
  statusOf: (word: T) => VocabularyWordStatus,
): T[] {
  return words
    .map((word, index) => ({ word, index, rank: ORDER[statusOf(word)] }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ word }) => word);
}

/** The set's progress: how many words are learned and mastered, of all. */
export function vocabularySetProgress(
  statuses: readonly VocabularyWordStatus[],
) {
  const learned = statuses.filter(
    (status) => status === "LEARNED" || status === "MASTERED",
  ).length;
  return {
    total: statuses.length,
    learned,
    mastered: statuses.filter((status) => status === "MASTERED").length,
    complete: statuses.length > 0 && learned === statuses.length,
  };
}
