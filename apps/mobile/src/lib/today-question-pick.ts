import { localSample } from "./local-sample";

/** How long a question answered right in Soal harian stays out of it. */
export const HIDE_CORRECT_DAYS = 3;
const HIDE_CORRECT_MS = HIDE_CORRECT_DAYS * 24 * 60 * 60 * 1000;

/** Question id → when it was last answered right (ms). */
export type CorrectQuestionMemory = Readonly<Record<string, number>>;

export function isRecentlyCorrect(
  memory: CorrectQuestionMemory,
  questionId: string,
  now: number,
) {
  const at = memory[questionId];
  return at !== undefined && now - at < HIDE_CORRECT_MS;
}

/** Drops answers older than the hiding window, so the memory stays small. */
export function pruneCorrectQuestions(
  memory: CorrectQuestionMemory,
  now: number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(memory).filter(([, at]) => now - at < HIDE_CORRECT_MS),
  );
}

/**
 * A round of Soal harian from the day's pool: questions not answered right
 * in the last `HIDE_CORRECT_DAYS` days, topped up with recently right ones
 * only when the pool has too few others.
 */
export function pickTodayQuestions<T extends { questionId: string }>(
  pool: readonly T[],
  {
    memory,
    now,
    count,
    seed,
  }: {
    memory: CorrectQuestionMemory;
    now: number;
    count: number;
    seed: string;
  },
): T[] {
  const fresh = pool.filter(
    (question) => !isRecentlyCorrect(memory, question.questionId, now),
  );
  if (fresh.length >= count) return localSample(fresh, seed, count);
  const hidden = pool.filter((question) =>
    isRecentlyCorrect(memory, question.questionId, now),
  );
  return localSample(
    [...fresh, ...localSample(hidden, `${seed}:hidden`, count - fresh.length)],
    seed,
    count,
  );
}
