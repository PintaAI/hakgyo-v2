import { timingSafeEqual } from "node:crypto";

import { env } from "~/env";
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

/**
 * Notification sweep, called every 10 minutes by the GitHub Actions workflow
 * `.github/workflows/notifications.yml` with
 * `Authorization: Bearer ${CRON_SECRET}`: sends due event/meeting reminders
 * and processes Expo push receipts.
 */
async function handler(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const reminders = await sendDueReminders(now);
  const receipts = await checkPushReceipts(now);
  return Response.json({ reminders, receipts });
}

export { handler as GET, handler as POST };
