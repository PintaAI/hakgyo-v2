import { z } from "zod";

/**
 * Assessment points and scores may have up to two decimals (EPS-TOPIK counts 2.5 per question).
 * They are stored as doubles, so every sum goes through `roundScore` to drop float noise.
 */
export const SCORE_DECIMALS = 2;
export const MAX_QUESTION_POINTS = 10_000;

const scale = 10 ** SCORE_DECIMALS;

export function roundScore(value: number) {
  const rounded = Math.round(value * scale) / scale;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Sums scores and rounds the total once. */
export function sumScores(values: Iterable<number>) {
  let total = 0;
  for (const value of values) total += value;
  return roundScore(total);
}

/** True when `value` has at most `SCORE_DECIMALS` decimals. */
export function hasScoreDecimals(value: number) {
  return (
    Number.isFinite(value) &&
    Math.abs(value * scale - Math.round(value * scale)) < 1e-6
  );
}

/** A score for Indonesian readers: `2,5`, `40`, `97,75`. */
export function formatScore(value: number) {
  return String(roundScore(value)).replace(".", ",");
}

/** `score/maxScore` with Indonesian decimals, e.g. `37,5/100`. */
export function formatScoreOutOf(
  score: number,
  maxScore: number,
  separator = "/",
) {
  return `${formatScore(score)}${separator}${formatScore(maxScore)}`;
}

/** Reads a score typed by a teacher, accepting a decimal comma. Returns NaN when invalid. */
export function parseScoreInput(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

export function scorePercent(score: number, maxScore: number) {
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
}

/** Zod schema for points of a question: positive, at most two decimals. */
export const questionPointsSchema = z
  .number()
  .positive()
  .max(MAX_QUESTION_POINTS)
  .refine(hasScoreDecimals, "Poin maksimal dua angka desimal.");

/** Question points typed by a teacher (`2,5` or `2.5`), or null when invalid. */
export function parseQuestionPoints(value: string) {
  const points = parseScoreInput(value);
  return questionPointsSchema.safeParse(points).success ? points : null;
}

/** A score typed by a teacher between 0 and `max`, or null when invalid. */
export function parseScoreValue(value: string, max: number) {
  const score = parseScoreInput(value);
  return scoreValueSchema.safeParse(score).success && score <= max + 1e-9
    ? score
    : null;
}

/** Zod schema for a score given by a teacher: zero or more, at most two decimals. */
export const scoreValueSchema = z
  .number()
  .min(0)
  .refine(hasScoreDecimals, "Nilai maksimal dua angka desimal.");

/**
 * Named score thresholds of an assessment, in percent of the maximum score. EPS-TOPIK uses two:
 * 60 for manufacturing and 45 for the other sectors. `passingScore` keeps its own meaning
 * (completing the course item).
 */
export const MAX_SCORE_BANDS = 5;

export const scoreBandSchema = z.object({
  label: z.string().trim().min(1).max(60),
  minPercent: z.number().min(0).max(100).refine(hasScoreDecimals),
});

export const scoreBandsSchema = z.array(scoreBandSchema).max(MAX_SCORE_BANDS);

export type ScoreBand = z.infer<typeof scoreBandSchema>;

/** Stored bands, highest threshold first; invalid stored JSON reads as no bands. */
export function readScoreBands(value: unknown): ScoreBand[] {
  const parsed = scoreBandsSchema.safeParse(value ?? []);
  if (!parsed.success) return [];
  return [...parsed.data].sort(
    (left, right) => right.minPercent - left.minPercent,
  );
}

export type ScoreBandResult = ScoreBand & { reached: boolean };

/** Every band with whether the score reaches it, highest threshold first. */
export function scoreBandResults(
  score: number,
  maxScore: number,
  bands: readonly ScoreBand[],
): ScoreBandResult[] {
  const percent = scorePercent(score, maxScore);
  return [...bands]
    .sort((left, right) => right.minPercent - left.minPercent)
    .map((band) => ({
      ...band,
      // The epsilon absorbs float noise (60 must reach 60), never a real hundredth.
      reached: maxScore > 0 && percent + 1e-9 >= band.minPercent,
    }));
}
