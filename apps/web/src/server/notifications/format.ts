/**
 * Notification copy helpers. Learner time zones are not stored reliably, so
 * event times are relative; meetings carry their own time zone.
 */

/** "45 menit", "3 jam", "2 hari"; never less than one minute. */
export function formatRelativeDuration(milliseconds: number): string {
  const minutes = Math.max(1, Math.round(milliseconds / 60_000));
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} jam`;
  return `${Math.round(hours / 24)} hari`;
}

/** "Sen, 6 Okt, 19.00 WIB" in the meeting's time zone. */
export function formatMeetingTime(startsAt: Date, timeZone: string): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  };
  try {
    return new Intl.DateTimeFormat("id-ID", { ...options, timeZone }).format(
      startsAt,
    );
  } catch {
    // Invalid stored zone: fall back to UTC rather than failing the push.
    return new Intl.DateTimeFormat("id-ID", {
      ...options,
      timeZone: "UTC",
    }).format(startsAt);
  }
}
