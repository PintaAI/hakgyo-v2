import { sampleForPractice } from "./policy";

// What Hari ini (web and mobile) practises, in order of need. Pure, so the
// order is unit tested; the practice router loads the signals from the
// learner's progress and calls these.

/** New words (never practised) that one day's vocabulary may introduce. */
export const DAILY_NEW_WORD_LIMIT = 10;

/** Questions from already passed quizzes in one day's sample, while others remain. */
export const DAILY_PASSED_QUESTION_LIMIT = 3;

/** How far back a wrong or revealed vocabulary answer marks a word as weak. */
export const RECENT_MISS_DAYS = 7;

export type VocabularyCandidate = {
  id: string;
  /** Progress for the entry's current content, or null when never practised. */
  progress: {
    practicedAt: Date | null;
    masteredAt: Date | null;
    nextReviewAt: Date | null;
  } | null;
  /** The latest answer in the last `RECENT_MISS_DAYS` was wrong or revealed. */
  recentlyMissed: boolean;
  /** The set's course item is completed. */
  setCompleted: boolean;
  /** Position of the set in the learner's outlines, then of the entry in its set. */
  setOrder: number;
  entryOrder: number;
};

const time = (date: Date | null) => date?.getTime() ?? 0;

/**
 * One day's vocabulary, most needed first, then shuffled with `seed` so a
 * session mixes them:
 * 1. reviews that are due (practised, not mastered), most overdue first;
 * 2. words missed recently;
 * 3. new words, at most `newLimit`: unfinished sets first, in course order;
 * 4. mastered words, least recently practised first, only to fill up;
 * 5. practised words not due yet, soonest due first, as a last resort.
 */
export function prioritizeVocabulary<T extends VocabularyCandidate>(
  candidates: readonly T[],
  {
    now,
    limit,
    seed,
    newLimit = DAILY_NEW_WORD_LIMIT,
  }: { now: Date; limit: number; seed: string; newLimit?: number },
): T[] {
  const due: T[] = [];
  const missed: T[] = [];
  const fresh: T[] = [];
  const mastered: T[] = [];
  const later: T[] = [];
  for (const candidate of candidates) {
    const { progress } = candidate;
    if (!progress) {
      (candidate.recentlyMissed ? missed : fresh).push(candidate);
    } else if (
      !progress.masteredAt &&
      (!progress.nextReviewAt || progress.nextReviewAt <= now)
    ) {
      due.push(candidate);
    } else if (candidate.recentlyMissed) {
      missed.push(candidate);
    } else if (progress.masteredAt) {
      mastered.push(candidate);
    } else {
      later.push(candidate);
    }
  }
  due.sort(
    (a, b) => time(a.progress!.nextReviewAt) - time(b.progress!.nextReviewAt),
  );
  fresh.sort(
    (a, b) =>
      Number(a.setCompleted) - Number(b.setCompleted) ||
      a.setOrder - b.setOrder ||
      a.entryOrder - b.entryOrder,
  );
  mastered.sort(
    (a, b) => time(a.progress!.practicedAt) - time(b.progress!.practicedAt),
  );
  later.sort(
    (a, b) => time(a.progress!.nextReviewAt) - time(b.progress!.nextReviewAt),
  );
  const chosen = [
    ...due,
    ...sampleForPractice(missed, `${seed}:missed`, missed.length),
    ...fresh.slice(0, newLimit),
    ...mastered,
    ...later,
  ].slice(0, limit);
  return sampleForPractice(chosen, `${seed}:order`, chosen.length);
}

export type QuestionCandidate = {
  id: string;
  /** The learner's latest graded answer to this question was not fully right. */
  answeredWrong: boolean;
  /** The quiz it belongs to is completed (passed). */
  assessmentPassed: boolean;
};

/**
 * One day's questions, then shuffled with `seed`:
 * 1. questions the learner got wrong in a tugas or quiz;
 * 2. questions of quizzes not passed yet;
 * 3. questions of passed quizzes: up to `passedLimit` places for review,
 *    more only when the groups above cannot fill the day.
 */
export function prioritizeQuestions<T extends QuestionCandidate>(
  candidates: readonly T[],
  {
    limit,
    seed,
    passedLimit = DAILY_PASSED_QUESTION_LIMIT,
  }: { limit: number; seed: string; passedLimit?: number },
): T[] {
  const shuffled = (items: T[], key: string) =>
    sampleForPractice(items, `${seed}:${key}`, items.length);
  const wrong = shuffled(
    candidates.filter((candidate) => candidate.answeredWrong),
    "wrong",
  );
  const open = shuffled(
    candidates.filter(
      (candidate) => !candidate.answeredWrong && !candidate.assessmentPassed,
    ),
    "open",
  );
  const passed = shuffled(
    candidates.filter(
      (candidate) => !candidate.answeredWrong && candidate.assessmentPassed,
    ),
    "passed",
  );
  const picked = wrong.slice(0, limit);
  const room = limit - picked.length;
  // Passed quizzes keep up to `passedLimit` places for review; open quizzes
  // take the rest, and passed ones fill whatever open ones leave empty.
  const reserved = Math.min(passed.length, passedLimit, room);
  const openTaken = open.slice(0, room - reserved);
  const passedTaken = passed.slice(0, room - openTaken.length);
  const chosen = [...picked, ...openTaken, ...passedTaken];
  return sampleForPractice(chosen, `${seed}:order`, chosen.length);
}

/** The day a practice sample belongs to, for its seed; Hakgyo's learners are mostly in WIB. */
export const PRACTICE_TIME_ZONE = "Asia/Jakarta";
