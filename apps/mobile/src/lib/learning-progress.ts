const DAYS_PER_STREAK_WEEK = 7;

export type StreakTone = "green" | "yellow" | "red";

export type WeeklyProgressDay = {
  active: boolean;
  dateKey: string;
  dateNumber: number;
  future: boolean;
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

export function getWeeklyProgressDays(input: {
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
