import { VOCABULARY_REVIEW_XP } from "./optimistic-gamification";

type ScoredAttempt = {
  entryId: string;
  result: "CORRECT" | "INCORRECT" | "REVEALED";
};

/**
 * The XP a game session earns, counted the way the server awards it
 * (`recordVocabularyAttempts`): only a word's first attempt in a session is
 * recorded, and it earns `VOCABULARY_REVIEW_XP` when it is right.
 */
export class SessionXp {
  private readonly seen = new Set<string>();
  xp = 0;

  add(attempt: ScoredAttempt) {
    if (this.seen.has(attempt.entryId)) return;
    this.seen.add(attempt.entryId);
    if (attempt.result === "CORRECT") this.xp += VOCABULARY_REVIEW_XP;
  }
}
