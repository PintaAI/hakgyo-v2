import { db } from "~/server/db";
import {
  notifyEventClosingSoon,
  notifyMeetingStartingSoon,
} from "~/server/notifications/triggers";

/**
 * Windows are wider than the cron interval (10 minutes, and GitHub schedules
 * often run late) so a delayed run still catches every event and meeting.
 */
export const EVENT_CLOSING_WINDOW_MS = 30 * 60_000;
export const MEETING_STARTING_WINDOW_MS = 60 * 60_000;

export type ReminderResult = { events: number; meetings: number };

/** Sends each "closes soon" / "starts soon" reminder at most once. */
export async function sendDueReminders(
  now = new Date(),
): Promise<ReminderResult> {
  const [events, meetings] = await Promise.all([
    db.assessmentEvent.findMany({
      where: {
        status: "OPEN",
        closingReminderSentAt: null,
        closesAt: {
          gt: now,
          lte: new Date(now.getTime() + EVENT_CLOSING_WINDOW_MS),
        },
        // Short events are still open from the "opened" push; skip them.
        openedAt: { lte: new Date(now.getTime() - EVENT_CLOSING_WINDOW_MS) },
      },
      select: { id: true },
    }),
    db.cohortMeeting.findMany({
      where: {
        status: "SCHEDULED",
        reminderSentAt: null,
        startsAt: {
          gt: now,
          lte: new Date(now.getTime() + MEETING_STARTING_WINDOW_MS),
        },
      },
      select: { id: true },
    }),
  ]);

  for (const event of events) {
    await notifyEventClosingSoon(event.id, now).catch((error: unknown) => {
      console.error("Failed to send event closing reminder", event.id, error);
    });
  }
  for (const meeting of meetings) {
    await notifyMeetingStartingSoon(meeting.id, now).catch((error: unknown) => {
      console.error("Failed to send meeting reminder", meeting.id, error);
    });
  }
  return { events: events.length, meetings: meetings.length };
}
