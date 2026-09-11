import { createHash } from "node:crypto";

export const vocabularyRecallPolicy = {
  version: 1,
  passesRequired: 3,
  failuresToForget: 2,
  retryDelayMs: 10 * 60 * 1000,
  reviewDelayMs: 24 * 60 * 60 * 1000,
  challengeLifetimeMs: 10 * 60 * 1000,
} as const;

export type MemoryState = {
  passStreak: number;
  failStreak: number;
  rememberedAt: Date | null;
  nextReviewAt: Date | null;
};

export function emptyMemory(): MemoryState {
  return {
    passStreak: 0,
    failStreak: 0,
    rememberedAt: null,
    nextReviewAt: null,
  };
}

export function normalizeRecallAnswer(answer: string) {
  return answer.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function vocabularyContentHash(entry: {
  term: string;
  definition: string;
}) {
  return createHash("sha256")
    .update(JSON.stringify([entry.term, entry.definition]))
    .digest("hex");
}

export function gradeRecallAnswer(answer: string, expectedAnswer: string) {
  const normalized = normalizeRecallAnswer(answer);
  return (
    normalized.length > 0 &&
    normalized === normalizeRecallAnswer(expectedAnswer)
  );
}

export function advanceMemory(
  state: MemoryState,
  correct: boolean,
  now: Date,
): MemoryState {
  const passStreak = correct
    ? Math.min(state.passStreak + 1, vocabularyRecallPolicy.passesRequired)
    : 0;
  const failStreak = correct
    ? 0
    : Math.min(state.failStreak + 1, vocabularyRecallPolicy.failuresToForget);
  const rememberedAt =
    failStreak >= vocabularyRecallPolicy.failuresToForget
      ? null
      : (state.rememberedAt ??
        (passStreak >= vocabularyRecallPolicy.passesRequired ? now : null));
  const delay =
    correct && (passStreak >= 2 || rememberedAt)
      ? vocabularyRecallPolicy.reviewDelayMs
      : vocabularyRecallPolicy.retryDelayMs;
  return {
    passStreak,
    failStreak,
    rememberedAt,
    nextReviewAt: new Date(now.getTime() + delay),
  };
}
