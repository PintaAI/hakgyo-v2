import { timingSafeEqual } from "node:crypto";

import { env } from "~/env";
import { db } from "~/server/db";
import { checkPushReceipts } from "~/server/notifications/receipts";
import { sendDueReminders } from "~/server/notifications/reminders";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Inbox history kept for a month, matching the app's Pembaruan history. */
const INBOX_RETENTION_MS = 30 * 24 * 60 * 60_000;

/**
 * Notification sweep, called every 10 minutes by the GitHub Actions workflow
 * `.github/workflows/notifications.yml` with
 * `Authorization: Bearer ${CRON_SECRET}`: sends due event/meeting reminders
 * processes Expo push receipts, and drops inbox rows older than 30 days.
 */
async function handler(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const reminders = await sendDueReminders(now);
  const receipts = await checkPushReceipts(now);
  const { count: expiredInbox } = await db.notification.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - INBOX_RETENTION_MS) } },
  });
  return Response.json({ reminders, receipts, expiredInbox });
}

export { handler as GET, handler as POST };
