/**
 * Classical item analysis over response rows, free of database access so the question-bank
 * generator can pool rows by `sourceQuestionId` the same way staff reports pool them by
 * `questionId` (docs/eps-topik-simulation.md section 5.8, docs/eps-question-generator.md section 5).
 */

export type ItemResponse = {
  /** `questionId` for one assessment; `sourceQuestionId` for bank statistics. */
  itemKey: string;
  attemptKey: string;
  /** The attempt's score in percent, comparable across packages. */
  attemptPercent: number;
  correct: boolean;
  /** Whether the learner answered at all (chose an option or wrote text). */
  answered: boolean;
  /** The chosen options (not their positions, which differ between copies); empty for written answers. */
  optionKeys: readonly string[];
  timeMs?: number;
};

export type ItemFlag =
  "too-hard" | "too-easy" | "low-discrimination" | "weak-distractor";

export type ItemStats = {
  responses: number;
  correct: number;
  /** Share of responses that were correct (p), 0–1. */
  correctRate: number;
  /** Upper 27 % minus lower 27 % correct rate (D), or null with fewer than `MIN_DISCRIMINATION_ATTEMPTS`. */
  discrimination: number | null;
  /** Share of responses that chose each option key (multiple-choice answers count every option). */
  optionRates: Map<string, number>;
  unansweredRate: number;
  averageTimeMs: number | null;
  /** Distractors chosen by fewer than `WEAK_DISTRACTOR_RATE` of responses. */
  weakDistractors: string[];
  /** Quality flags; only raised with at least `MIN_FLAG_RESPONSES` responses. */
  flags: ItemFlag[];
};

/** Conventional thresholds of classical test theory (research report section 5.1). */
export const TOO_HARD_RATE = 0.3;
export const TOO_EASY_RATE = 0.9;
export const LOW_DISCRIMINATION = 0.2;
export const WEAK_DISTRACTOR_RATE = 0.05;
/** Upper and lower groups are this share of the attempts. */
export const DISCRIMINATION_GROUP_SHARE = 0.27;
export const MIN_DISCRIMINATION_ATTEMPTS = 4;
/** Below this many responses a flag is noise, so none are raised. */
export const MIN_FLAG_RESPONSES = 10;

function round(value: number, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

/**
 * Stats per item. Pass every attempt's row for every item, including unanswered ones (`correct:
 * false`, `answered: false`), so rates share one denominator. `distractors` lists the wrong
 * option keys of each item, so distractors nobody chose are reported too.
 */
export function analyzeItems(
  responses: readonly ItemResponse[],
  options: { distractors?: ReadonlyMap<string, readonly string[]> } = {},
): Map<string, ItemStats> {
  const attemptPercent = new Map<string, number>();
  for (const response of responses) {
    attemptPercent.set(response.attemptKey, response.attemptPercent);
  }
  // Ties are broken by key so the groups are deterministic.
  const ranked = [...attemptPercent.entries()].sort(
    (left, right) =>
      right[1] - left[1] ||
      (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0),
  );
  const groupSize = Math.max(
    1,
    Math.ceil(ranked.length * DISCRIMINATION_GROUP_SHARE),
  );
  const upper = new Set(ranked.slice(0, groupSize).map(([key]) => key));
  const lower = new Set(ranked.slice(-groupSize).map(([key]) => key));

  const byItem = new Map<string, ItemResponse[]>();
  for (const response of responses) {
    const list = byItem.get(response.itemKey);
    if (list) list.push(response);
    else byItem.set(response.itemKey, [response]);
  }

  const result = new Map<string, ItemStats>();
  for (const [itemKey, rows] of byItem) {
    const correct = rows.filter((row) => row.correct).length;
    const correctRate = correct / rows.length;
    const optionCounts = new Map<string, number>();
    for (const row of rows) {
      for (const key of new Set(row.optionKeys)) {
        optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
      }
    }
    const unanswered = rows.filter((row) => !row.answered).length;
    const optionRates = new Map(
      [...optionCounts].map(
        ([key, count]) => [key, round(count / rows.length)] as const,
      ),
    );

    let discrimination: number | null = null;
    const attempts = new Set(rows.map((row) => row.attemptKey)).size;
    if (attempts >= MIN_DISCRIMINATION_ATTEMPTS) {
      const upperRows = rows.filter((row) => upper.has(row.attemptKey));
      const lowerRows = rows.filter((row) => lower.has(row.attemptKey));
      if (upperRows.length && lowerRows.length) {
        const rate = (group: ItemResponse[]) =>
          group.filter((row) => row.correct).length / group.length;
        discrimination = round(rate(upperRows) - rate(lowerRows));
      }
    }

    const times = rows.flatMap((row) =>
      row.timeMs === undefined ? [] : [row.timeMs],
    );
    const weakDistractors = (options.distractors?.get(itemKey) ?? []).filter(
      (key) =>
        (optionCounts.get(key) ?? 0) / rows.length < WEAK_DISTRACTOR_RATE,
    );

    const flags: ItemFlag[] = [];
    if (rows.length >= MIN_FLAG_RESPONSES) {
      if (correctRate < TOO_HARD_RATE) flags.push("too-hard");
      if (correctRate > TOO_EASY_RATE) flags.push("too-easy");
      if (discrimination !== null && discrimination < LOW_DISCRIMINATION) {
        flags.push("low-discrimination");
      }
      if (weakDistractors.length) flags.push("weak-distractor");
    }

    result.set(itemKey, {
      responses: rows.length,
      correct,
      correctRate: round(correctRate),
      discrimination,
      optionRates,
      unansweredRate: round(unanswered / rows.length),
      averageTimeMs: times.length
        ? Math.round(
            times.reduce((total, time) => total + time, 0) / times.length,
          )
        : null,
      weakDistractors,
      flags,
    });
  }
  return result;
}

export const itemFlagLabels: Record<ItemFlag, string> = {
  "too-hard": "Terlalu sulit",
  "too-easy": "Terlalu mudah",
  "low-discrimination": "Daya beda rendah",
  "weak-distractor": "Pengecoh lemah",
};
