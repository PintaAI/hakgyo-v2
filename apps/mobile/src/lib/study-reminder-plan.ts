// The parts of the daily study reminder that need no native module, so they
// can be unit tested. Scheduling and storage live in `study-reminder.ts`.

export type StudyReminder = {
  enabled: boolean;
  /** Planned study time per day, shown in the reminder's text. */
  minutes: number;
  hour: number;
  minute: number;
};

export const STUDY_MINUTE_OPTIONS = [5, 10, 15, 20] as const;

export const REMINDER_TIME_PRESETS = [
  { label: "Pagi", hour: 7, minute: 0 },
  { label: "Siang", hour: 12, minute: 0 },
  { label: "Malam", hour: 19, minute: 0 },
] as const;

export const DEFAULT_STUDY_REMINDER: StudyReminder = {
  enabled: false,
  minutes: 10,
  hour: 19,
  minute: 0,
};

/**
 * Days scheduled ahead. One notification per day rather than a repeating
 * trigger, so a day the learner already studied can be left out. Every app
 * open schedules the window again; iOS keeps at most 64 pending.
 */
export const STUDY_REMINDER_DAYS = 30;

function isInteger(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

/** Reads the stored reminder, falling back field by field to the default. */
export function parseStudyReminder(raw: string | null): StudyReminder {
  if (!raw) return DEFAULT_STUDY_REMINDER;
  let value: Partial<Record<keyof StudyReminder, unknown>>;
  try {
    value = JSON.parse(raw) as typeof value;
  } catch {
    return DEFAULT_STUDY_REMINDER;
  }
  if (!value || typeof value !== "object") return DEFAULT_STUDY_REMINDER;
  return {
    enabled: value.enabled === true,
    minutes: isInteger(value.minutes, 1, 240)
      ? value.minutes
      : DEFAULT_STUDY_REMINDER.minutes,
    hour: isInteger(value.hour, 0, 23)
      ? value.hour
      : DEFAULT_STUDY_REMINDER.hour,
    minute: isInteger(value.minute, 0, 59)
      ? value.minute
      : DEFAULT_STUDY_REMINDER.minute,
  };
}

/** "19.00", the Indonesian way of writing a time. */
export function formatReminderTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}.${String(minute).padStart(2, "0")}`;
}

/** "19.00 · 10 menit", or "Mati" when the reminder is off. */
export function studyReminderSummary(reminder: StudyReminder) {
  return reminder.enabled
    ? `${formatReminderTime(reminder.hour, reminder.minute)} · ${reminder.minutes} menit`
    : "Mati";
}

/**
 * When the next reminders fire: the reminder time on each of the next
 * `days` days, leaving out times already past and today when the learner
 * has already studied.
 */
export function planStudyReminderDates(
  reminder: Pick<StudyReminder, "hour" | "minute">,
  {
    now,
    studiedToday,
    days = STUDY_REMINDER_DAYS,
  }: { now: Date; studiedToday: boolean; days?: number },
): Date[] {
  const dates: Date[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    if (offset === 0 && studiedToday) continue;
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      reminder.hour,
      reminder.minute,
    );
    if (date.getTime() > now.getTime()) dates.push(date);
  }
  return dates;
}

const MESSAGES: { title: string; body: (minutes: number) => string }[] = [
  {
    title: "Waktunya belajar Korea",
    body: (minutes) => `${minutes} menit hari ini sudah cukup. Yuk mulai!`,
  },
  {
    title: "Jaga streak-mu",
    body: (minutes) =>
      `Luangkan ${minutes} menit untuk kosakata atau satu materi.`,
  },
  {
    title: "Sedikit, tapi rutin",
    body: (minutes) => `${minutes} menit belajar hari ini, siap?`,
  },
];

/** The text of the reminder on `date`, rotating daily so it does not go stale. */
export function studyReminderContent(minutes: number, date: Date) {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  const message = MESSAGES[dayNumber % MESSAGES.length]!;
  return { title: message.title, body: message.body(minutes) };
}
