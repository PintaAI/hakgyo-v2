import type { RouterOutputs } from "~/trpc/react";

export type GamificationSummary = RouterOutputs["gamification"]["getMySummary"];

/**
 * XP the server awards per correct vocabulary attempt. Mirrors
 * `DEFAULT_REWARD_RULES.VOCABULARY_REVIEWED` in
 * `~/server/gamification/logic.ts`; keep them in sync.
 */
export const VOCABULARY_REVIEW_XP = 5;

export type WeeklyProgressDay = {
  active: boolean;
  dateKey: string;
  dateNumber: number;
  future: boolean;
  today: boolean;
  weekday: string;
};

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getStreakProgressDays(input: {
  activeDates: readonly string[];
  startsOn: string;
  today: string;
}): WeeklyProgressDay[] {
  const activeDates = new Set(input.activeDates);

  return WEEKDAYS.map((weekday, index) => {
    const dateKey = shiftDateKey(input.startsOn, index);

    return {
      active: activeDates.has(dateKey),
      dateKey,
      dateNumber: Number(dateKey.slice(-2)),
      future: dateKey > input.today,
      today: dateKey === input.today,
      weekday,
    };
  });
}

/** `YYYY-MM-DD` for `date` in `timeZone`, falling back to the device zone. */
export function localDateKey(date: Date, timeZone?: string): string {
  const format = (zone?: string) =>
    new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      timeZone: zone,
      year: "numeric",
    }).formatToParts(date);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = format(timeZone);
  } catch {
    parts = format();
  }
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * Applies one correct vocabulary attempt to the cached summary so the weekly
 * streak and XP react immediately. The server's summary replaces this once the
 * round finishes, so it only has to match the common case.
 */
export function applyVocabularyReward(
  gamification: GamificationSummary,
  todayKey: string,
): GamificationSummary {
  const { summary, weeklyActivity, profileStats } = gamification;
  const weekEnd = shiftDateKey(weeklyActivity.startsOn, 6);
  const inWeek = todayKey >= weeklyActivity.startsOn && todayKey <= weekEnd;
  // A cached summary from an earlier week can't place today on its calendar;
  // leave it for the server to refresh.
  if (!inWeek) return gamification;

  const lastActivityKey = summary.lastActivityDate
    ? new Date(summary.lastActivityDate).toISOString().slice(0, 10)
    : null;
  const activeToday =
    weeklyActivity.activeDates.includes(todayKey) ||
    lastActivityKey === todayKey;
  // An unbroken streak is anchored on yesterday until today's first activity
  // extends it.
  const continuesStreak =
    summary.currentStreak > 0 &&
    (lastActivityKey === null ||
      lastActivityKey === shiftDateKey(todayKey, -1));
  const currentStreak = activeToday
    ? summary.currentStreak
    : continuesStreak
      ? summary.currentStreak + 1
      : 1;

  return {
    ...gamification,
    profileStats: {
      ...profileStats,
      totalXp: profileStats.totalXp + VOCABULARY_REVIEW_XP,
    },
    summary: {
      ...summary,
      currentStreak,
      lastActivityDate: new Date(`${todayKey}T00:00:00.000Z`),
      longestStreak: Math.max(summary.longestStreak, currentStreak),
      totalXp: summary.totalXp + VOCABULARY_REVIEW_XP,
      // A first-ever activity turns the server's empty placeholder summary into
      // a real one; the next refresh replaces it with the stored row.
      updatedAt: summary.updatedAt ?? new Date(),
    },
    weeklyActivity: {
      ...weeklyActivity,
      activeDates: activeToday
        ? weeklyActivity.activeDates
        : [...weeklyActivity.activeDates, todayKey].sort(),
      today: todayKey > weeklyActivity.today ? todayKey : weeklyActivity.today,
      xp: weeklyActivity.xp + VOCABULARY_REVIEW_XP,
    },
  };
}
