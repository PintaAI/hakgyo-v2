import { createHash } from "node:crypto";

export const vocabularyProgressPolicy = {
  masteryRecallCount: 2,
  retryDelayMs: 10 * 60 * 1000,
  firstReviewDelayMs: 24 * 60 * 60 * 1000,
  masteredReviewDelayMs: 30 * 24 * 60 * 60 * 1000,
} as const;

export type VocabularyEvidence = "RECOGNITION" | "RECALL" | "APPLICATION";
export type VocabularyResult = "CORRECT" | "INCORRECT" | "REVEALED";

export type VocabularyProgressState = {
  practicedAt: Date | null;
  masteredAt: Date | null;
  nextReviewAt: Date | null;
  correctRecallCount: number;
};

export function emptyVocabularyProgress(): VocabularyProgressState {
  return {
    practicedAt: null,
    masteredAt: null,
    nextReviewAt: null,
    correctRecallCount: 0,
  };
}

export function vocabularyContentHash(entry: {
  term: string;
  definition: string;
}) {
  return createHash("sha256")
    .update(JSON.stringify([entry.term, entry.definition]))
    .digest("hex");
}

export function advanceVocabularyProgress(
  state: VocabularyProgressState,
  attempt: { evidence: VocabularyEvidence; result: VocabularyResult },
  now: Date,
): VocabularyProgressState {
  if (attempt.result === "REVEALED") return state;

  const practicedAt = state.practicedAt ?? now;
  const masteryEligible =
    attempt.evidence === "RECALL" || attempt.evidence === "APPLICATION";
  if (!masteryEligible) return { ...state, practicedAt };
  if (attempt.result === "INCORRECT") {
    return {
      practicedAt,
      masteredAt: state.masteredAt,
      correctRecallCount: state.masteredAt ? state.correctRecallCount : 0,
      nextReviewAt: new Date(
        now.getTime() + vocabularyProgressPolicy.retryDelayMs,
      ),
    };
  }

  const due = !state.nextReviewAt || state.nextReviewAt <= now;
  if (!due) return { ...state, practicedAt };
  const correctRecallCount = Math.min(
    vocabularyProgressPolicy.masteryRecallCount,
    state.correctRecallCount + 1,
  );
  const masteredAt =
    state.masteredAt ??
    (correctRecallCount >= vocabularyProgressPolicy.masteryRecallCount
      ? now
      : null);
  const reviewDelay = masteredAt
    ? vocabularyProgressPolicy.masteredReviewDelayMs
    : vocabularyProgressPolicy.firstReviewDelayMs;

  return {
    practicedAt,
    masteredAt,
    correctRecallCount,
    nextReviewAt: new Date(now.getTime() + reviewDelay),
  };
}

export function vocabularyProgressStatus(state: VocabularyProgressState) {
  if (state.masteredAt) return "MASTERED" as const;
  if (state.practicedAt) return "LEARNING" as const;
  return "NEW" as const;
}
