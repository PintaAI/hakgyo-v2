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
