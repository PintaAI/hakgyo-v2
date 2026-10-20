/**
 * Outbox dedupe keys. Each trigger may run more than once (retries, overlapping
 * crons, a second click); the unique key turns repeats into no-ops. Times in a
 * key make a moved meeting or a rescheduled event send a new message.
 */

/** Manual creation: `attempt` counts earlier requests, so a second click collides. */
export function createGroupKey(cohortId: string, attempt: number) {
  return `create-group:${cohortId}:${attempt}`;
}

export function autoCreateGroupKey(cohortId: string) {
  return `create-group:${cohortId}:auto`;
}

export function meetingReminderPrefix(meetingId: string) {
  return `meeting-reminder:${meetingId}:`;
}

export function meetingReminderKey(meetingId: string, startsAt: Date) {
  return `${meetingReminderPrefix(meetingId)}${startsAt.toISOString()}`;
}

export function eventScheduledPrefix(eventId: string) {
  return `event-scheduled:${eventId}:`;
}

export function eventScheduledKey(
  eventId: string,
  cohortId: string,
  opensAt: Date,
) {
  return `${eventScheduledPrefix(eventId)}${cohortId}:${opensAt.toISOString()}`;
}
