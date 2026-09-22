const DAYS_PER_STREAK_WEEK = 7;

export type StreakTone = "green" | "yellow" | "red";

export type WeeklyProgressDay = {
  active: boolean;
  dateKey: string;
  dateNumber: number;
  future: boolean;
  tone: StreakTone | null;
  today: boolean;
  weekday: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shiftDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getStreakStage(currentStreak: number) {
  const streak = Math.max(0, Math.floor(currentStreak));
  const week = streak === 0 ? 1 : Math.ceil(streak / DAYS_PER_STREAK_WEEK);
  const progress = streak === 0 ? 0 : ((streak - 1) % DAYS_PER_STREAK_WEEK) + 1;
  const tone: StreakTone = week === 1 ? "green" : week === 2 ? "yellow" : "red";

  return { progress, tone, week };
}

export function getStreakLabel(currentStreak: number) {
  const streak = Math.max(0, Math.floor(currentStreak));
  return `${streak} day streak`;
}

export function getStreakProgressDays(input: {
  activeDates: readonly string[];
  currentStreak: number;
  startsOn: string;
  today: string;
}): WeeklyProgressDay[] {
  const activeDates = new Set(input.activeDates);
  const currentStreak = Math.max(0, Math.floor(input.currentStreak));
  const activeToday = activeDates.has(input.today);
  const streakEndsOn = activeToday
    ? input.today
    : shiftDateKey(input.today, -1);
  const streakStartsOn = shiftDateKey(streakEndsOn, -(currentStreak - 1));
  const streakStartDay = new Date(`${streakStartsOn}T00:00:00.000Z`);
  const streakStartWeekday = (streakStartDay.getUTCDay() + 6) % 7;

  return WEEKDAYS.map((weekday, index) => {
    const calendarDateKey = shiftDateKey(input.startsOn, index);
    const firstOffset =
      (index - streakStartWeekday + DAYS_PER_STREAK_WEEK) %
      DAYS_PER_STREAK_WEEK;
    const active = currentStreak > firstOffset;
    const latestOffset = active
      ? firstOffset +
        Math.floor((currentStreak - 1 - firstOffset) / DAYS_PER_STREAK_WEEK) *
          DAYS_PER_STREAK_WEEK
      : null;
    const dateKey =
      latestOffset === null
        ? calendarDateKey
        : shiftDateKey(streakStartsOn, latestOffset);
    const tone =
      latestOffset === null ? null : getStreakStage(latestOffset + 1).tone;

    return {
      active,
      dateKey,
      dateNumber: Number(dateKey.slice(-2)),
      future: !active && calendarDateKey > input.today,
      tone,
      today: calendarDateKey === input.today,
      weekday,
    };
  });
}
