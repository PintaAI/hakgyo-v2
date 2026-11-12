import Storage from "expo-sqlite/kv-store";

/**
 * A game's personal best, kept on this device only: per game and vocabulary
 * set (or Hangeul stage). Never synced, so a new phone starts fresh.
 */
export type GameScore = {
  value: number;
  /** For "9/10" scores; points (Hujan Kata, Cocokkan) have none. */
  max?: number;
};

export type PersonalBest = GameScore & { at: string };

export type BestOutcome = {
  /** The best before this round, if any. */
  previous: PersonalBest | null;
  /** This round beat it (or is the first one with a score). */
  isNew: boolean;
};

const KEY_PREFIX = "hakgyo:game-best:v1:";

/**
 * Whether `next` beats `previous`. Out-of scores compare as shares, so 9/10
 * beats 8/9; an equal share counts only with more right. Points compare as
 * they are. A zero never sets a record.
 */
export function beatsBest(next: GameScore, previous: GameScore | null) {
  if (next.value <= 0) return false;
  if (!previous) return true;
  if (next.max && previous.max) {
    const nextShare = next.value / next.max;
    const previousShare = previous.value / previous.max;
    if (nextShare !== previousShare) return nextShare > previousShare;
  }
  return next.value > previous.value;
}

/** "9/10", or "1.240 poin". */
export function formatScore(score: GameScore) {
  return score.max
    ? `${score.value}/${score.max}`
    : `${score.value.toLocaleString("id-ID")} poin`;
}

function read(scope: string): PersonalBest | null {
  try {
    const raw = Storage.getItemSync(KEY_PREFIX + scope);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (!saved || typeof saved !== "object") return null;
    const record = saved as Record<string, unknown>;
    if (typeof record.value !== "number") return null;
    return {
      value: record.value,
      max: typeof record.max === "number" ? record.max : undefined,
      at: typeof record.at === "string" ? record.at : "",
    };
  } catch {
    return null;
  }
}

/** Saves `score` when it beats the stored best, and tells how it compared. */
export function recordBest(scope: string, score: GameScore): BestOutcome {
  const previous = read(scope);
  const isNew = beatsBest(score, previous);
  if (isNew) {
    try {
      Storage.setItemSync(
        KEY_PREFIX + scope,
        JSON.stringify({ ...score, at: new Date().toISOString() }),
      );
    } catch {
      // Shown as a record this time; the old best stays next time.
    }
  }
  return { previous, isNew };
}
