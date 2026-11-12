/**
 * Latihan's "Untukmu": instead of a long list, the source sheet suggests one
 * vocabulary set (or tugas) and two alternatives, each with the reason it was
 * picked. Picks come from fixed priority groups, not a hidden score, so the
 * reason shown is always the real one.
 *
 * Vocabulary, in order:
 *  1. Perlu diulang: words due for review (most first).
 *  2. Lanjutkan: the set last played in this game, unfinished; then sets with
 *     words still to memorise.
 *  3. The chapter the learner is on in Belajar: its unfinished sets.
 *  4. The next unfinished set in curriculum order.
 *  5. Ulangi: a finished set, the one practised longest ago.
 * A set already played in this game today drops to the end unless it has
 * words due. Susun makna only suggests sets with example sentences.
 *
 * Archived courses (Hangeul Mastery, classes under Diarsipkan on Belajar)
 * are never suggested, not even for review; their sets and quizzes stay in
 * the sheet's full list. Class tugas are suggested whatever the class.
 *
 * Quiz, in order: open class tugas (in progress, then closing soonest), a
 * quiz left in progress, a quiz to retry, then the next quiz to take (the
 * current chapter first).
 */

export type SetSummary = {
  total: number;
  memorize: number;
  learned: number;
  mastered: number;
  due: number;
  upcomingReviews: string[];
  lastPracticedAt: string | null;
  withExamples: number;
};

export type PracticeSourceItem = {
  key: string;
  courseId: string;
  id: string;
  moduleId: string;
  moduleTitle: string;
  isCompleted: boolean;
  attempt: { id: string; status: string } | null;
};

export type LastPlayedRef =
  | { kind: "item"; courseId: string; courseItemId: string; at: string }
  | { kind: "event"; eventId: string; at: string };

export type Suggestion<T> = {
  item: T;
  /** Short label, for the chip on the main pick. */
  label: string;
  /** Why, in one plain line. */
  reason: string;
};

/** Words due now: due when summarised, plus reviews that fell due since. */
export function dueWords(summary: SetSummary | undefined, now: number) {
  if (!summary) return 0;
  let due = summary.due;
  for (const at of summary.upcomingReviews) {
    if (Date.parse(at) <= now) due += 1;
    else break;
  }
  return due;
}

function sameLocalDay(iso: string, now: number) {
  const a = new Date(iso);
  const b = new Date(now);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function lastPlayedItemKey(lastPlayed: LastPlayedRef | undefined) {
  return lastPlayed?.kind === "item"
    ? `${lastPlayed.courseId}:${lastPlayed.courseItemId}`
    : null;
}

/** Takes up to three, in group order, without repeats. */
function pickThree<T extends { key: string }>(
  groups: Suggestion<T>[][],
): Suggestion<T>[] {
  const seen = new Set<string>();
  const picks: Suggestion<T>[] = [];
  for (const group of groups) {
    for (const suggestion of group) {
      if (seen.has(suggestion.item.key)) continue;
      seen.add(suggestion.item.key);
      picks.push(suggestion);
      if (picks.length === 3) return picks;
    }
  }
  return picks;
}

export function suggestVocabularySets<T extends PracticeSourceItem>(input: {
  /** Every set the learner can open, in curriculum order. */
  items: readonly T[];
  summaries: Readonly<Record<string, SetSummary>> | undefined;
  /** The chapter each course is at in Belajar (its resume item's chapter). */
  currentModuleByCourse: Readonly<Record<string, string | undefined>>;
  gameKey: string | undefined;
  lastPlayed: LastPlayedRef | undefined;
  now: number;
  /** Courses the learner archived: left out of the suggestions. */
  archivedCourseIds?: ReadonlySet<string>;
}): Suggestion<T>[] {
  const { items, summaries, now } = input;
  const summaryOf = (item: T) => summaries?.[item.id];
  // Susun makna needs example sentences; unknown summaries stay in.
  const playable = items.filter((item) => {
    if (input.archivedCourseIds?.has(item.courseId)) return false;
    if (input.gameKey !== "sentences") return true;
    const summary = summaryOf(item);
    return !summary || summary.withExamples > 0;
  });
  const lastKey = lastPlayedItemKey(input.lastPlayed);
  const playedToday =
    input.lastPlayed && sameLocalDay(input.lastPlayed.at, now) ? lastKey : null;
  const fresh = playable.filter((item) => item.key !== playedToday);

  const due = playable
    .map((item) => ({ item, words: dueWords(summaryOf(item), now) }))
    .filter(({ words }) => words > 0)
    .sort((a, b) => b.words - a.words)
    .map(({ item, words }) => ({
      item,
      label: "Perlu diulang",
      reason: `${words} kata perlu diulang`,
    }));

  const continueLast = fresh
    .filter((item) => item.key === lastKey && !item.isCompleted)
    .map((item) => ({
      item,
      label: "Lanjutkan",
      reason: "Lanjutkan yang terakhir kamu mainkan",
    }));
  const memorize = fresh
    .filter((item) => !item.isCompleted && (summaryOf(item)?.memorize ?? 0) > 0)
    .sort(
      (a, b) => (summaryOf(b)?.memorize ?? 0) - (summaryOf(a)?.memorize ?? 0),
    )
    .map((item) => ({
      item,
      label: "Lanjutkan",
      reason: `${summaryOf(item)?.memorize ?? 0} kata belum hafal`,
    }));

  const current = fresh
    .filter(
      (item) =>
        !item.isCompleted &&
        input.currentModuleByCourse[item.courseId] === item.moduleId,
    )
    .map((item) => ({
      item,
      label: "Bab sekarang",
      reason: "Bab yang sedang kamu pelajari",
    }));

  const next = fresh
    .filter((item) => !item.isCompleted)
    .map((item) => ({
      item,
      label: "Berikutnya",
      reason: summaryOf(item)?.lastPracticedAt ? "Belum selesai" : "Set baru",
    }));

  // Finished sets, the one practised longest ago first.
  const review = fresh
    .filter((item) => item.isCompleted)
    .sort(
      (a, b) =>
        Date.parse(summaryOf(a)?.lastPracticedAt ?? "1970-01-01") -
        Date.parse(summaryOf(b)?.lastPracticedAt ?? "1970-01-01"),
    )
    .map((item) => ({
      item,
      label: "Ulangi",
      reason: "Sudah selesai · ulangi supaya tetap ingat",
    }));

  // Played here today and nothing due: only when nothing else is left.
  const again = playable
    .filter((item) => item.key === playedToday)
    .map((item) => ({
      item,
      label: "Main lagi",
      reason: "Sudah kamu mainkan hari ini",
    }));

  return pickThree([due, continueLast, memorize, current, next, review, again]);
}

export type PracticeEvent = {
  id: string;
  status?: string | null;
  opensAt?: Date | null;
  closesAt: Date | null;
  attempts: { status: string }[];
};

export type QuizSuggestion<T, E> =
  | (Suggestion<{ key: string; event: E }> & { kind: "event" })
  | (Suggestion<{ key: string; quiz: T }> & { kind: "quiz" });

export function suggestQuizzes<
  T extends PracticeSourceItem,
  E extends PracticeEvent,
>(input: {
  quizzes: readonly T[];
  events: readonly E[];
  currentModuleByCourse: Readonly<Record<string, string | undefined>>;
  now: number;
  closesLabel: (closesAt: Date) => string;
  /** Courses the learner archived: their quizzes are left out. */
  archivedCourseIds?: ReadonlySet<string>;
}): QuizSuggestion<T, E>[] {
  const { now } = input;
  const quizzes = input.quizzes.filter(
    (item) => !input.archivedCourseIds?.has(item.courseId),
  );
  const startable = input.events.filter(
    (event) =>
      !(
        event.status === "SCHEDULED" &&
        event.opensAt &&
        event.opensAt.getTime() > now
      ),
  );
  const events = [...startable]
    .sort((a, b) => {
      const aStarted = a.attempts[0]?.status === "IN_PROGRESS" ? 0 : 1;
      const bStarted = b.attempts[0]?.status === "IN_PROGRESS" ? 0 : 1;
      if (aStarted !== bStarted) return aStarted - bStarted;
      return (
        (a.closesAt?.getTime() ?? Infinity) -
        (b.closesAt?.getTime() ?? Infinity)
      );
    })
    .map((event): QuizSuggestion<T, E> => ({
      kind: "event",
      item: { key: `event:${event.id}`, event },
      label: "Tugas kelas",
      reason:
        event.attempts[0]?.status === "IN_PROGRESS"
          ? "Sudah dimulai · selesaikan sekarang"
          : event.closesAt
            ? `Tugas kelas · ${input.closesLabel(event.closesAt)}`
            : "Tugas kelas yang sedang dibuka",
    }));

  const quiz = (
    item: T,
    label: string,
    reason: string,
  ): QuizSuggestion<T, E> => ({
    kind: "quiz",
    item: { key: item.key, quiz: item },
    label,
    reason,
  });
  const inProgress = quizzes
    .filter((item) => item.attempt?.status === "IN_PROGRESS")
    .map((item) => quiz(item, "Lanjutkan", "Belum selesai · lanjutkan"));
  const retry = quizzes
    .filter((item) => !item.isCompleted && item.attempt?.status === "GRADED")
    .map((item) => quiz(item, "Coba lagi", "Belum lulus · coba lagi"));
  const untouched = quizzes.filter(
    (item) => !item.isCompleted && !item.attempt,
  );
  const current = untouched
    .filter(
      (item) => input.currentModuleByCourse[item.courseId] === item.moduleId,
    )
    .map((item) => quiz(item, "Bab sekarang", "Bab yang sedang kamu pelajari"));
  const next = untouched.map((item) =>
    quiz(item, "Berikutnya", "Quiz berikutnya"),
  );
  return pickThree<{ key: string }>([
    events,
    inProgress,
    retry,
    current,
    next,
  ] as Suggestion<{ key: string }>[][]) as QuizSuggestion<T, E>[];
}
