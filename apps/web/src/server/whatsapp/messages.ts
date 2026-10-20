import { formatMeetingTime } from "~/server/notifications/format";

/**
 * Copy for WhatsApp group messages. Group messages are read later and by
 * everyone in the class, so times are absolute with their zone label (push
 * notifications use relative times instead). `*text*` is bold in WhatsApp.
 */

/** Learners are mostly in WIB; events do not store a time zone. */
export const EVENT_TIME_ZONE = "Asia/Jakarta";

/** WhatsApp's limits for group subjects and descriptions. */
export const GROUP_SUBJECT_MAX_LENGTH = 100;
export const GROUP_DESCRIPTION_MAX_LENGTH = 2048;

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function groupSubject(cohortName: string) {
  return truncate(cohortName.trim(), GROUP_SUBJECT_MAX_LENGTH);
}

export function groupDescription(input: {
  appUrl: string;
  cohortDescription: string | null;
  courseId: string;
  courseTitle: string;
}) {
  const footer = `Kelas ${input.courseTitle} di Hakgyo: ${input.appUrl}/learn/${input.courseId}`;
  const description = input.cohortDescription?.trim();
  if (!description) return truncate(footer, GROUP_DESCRIPTION_MAX_LENGTH);
  const room = GROUP_DESCRIPTION_MAX_LENGTH - footer.length - 2;
  return room > 0 ? `${truncate(description, room)}\n\n${footer}` : footer;
}

export function meetingReminderText(input: {
  appUrl: string;
  title: string;
  startsAt: Date;
  timeZone: string;
  joinUrl: string | null;
  courseId: string;
}) {
  return [
    `*Segera dimulai: ${input.title}*`,
    formatMeetingTime(input.startsAt, input.timeZone),
    input.joinUrl ? `Gabung meeting: ${input.joinUrl}` : null,
    `Detail kelas: ${input.appUrl}/learn/${input.courseId}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function eventScheduledText(input: {
  appUrl: string;
  eventId: string;
  type: string;
  title: string;
  courseTitle: string;
  opensAt: Date;
  closesAt: Date | null;
}) {
  const label = input.type === "TRYOUT" ? "Tryout" : "Latihan";
  return [
    `*${label} dijadwalkan: ${input.title}*`,
    input.courseTitle,
    `Dibuka: ${formatMeetingTime(input.opensAt, EVENT_TIME_ZONE)}`,
    input.closesAt
      ? `Ditutup: ${formatMeetingTime(input.closesAt, EVENT_TIME_ZONE)}`
      : null,
    `Kerjakan di Hakgyo: ${input.appUrl}/learn/assessments/${input.eventId}`,
  ]
    .filter(Boolean)
    .join("\n");
}
