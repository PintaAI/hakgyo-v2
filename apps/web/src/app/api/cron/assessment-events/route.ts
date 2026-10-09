import { timingSafeEqual } from "node:crypto";

import { env } from "~/env";
import { runAssessmentEventLifecycle } from "~/server/assessment/event-lifecycle";
import { db } from "~/server/db";
import { notifyEventOpened } from "~/server/notifications/triggers";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Grading stops here so the response (and the notifications) fit in `maxDuration`. */
const GRADING_BUDGET_MS = 200_000;

function isAuthorized(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Assessment event lifecycle, called every 5 minutes by the GitHub Actions workflow
 * `.github/workflows/assessment-events.yml` with `Authorization: Bearer ${CRON_SECRET}`:
 * opens due scheduled events (and pushes the "opened" notice), closes events past their
 * closing time and grades attempts left in progress in batches. Learners starting a due
 * scheduled event open it right away, so a late run only delays the push.
 */
async function handler(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const startedAt = Date.now();
  const result = await runAssessmentEventLifecycle(
    db,
    new Date(startedAt),
    startedAt + GRADING_BUDGET_MS,
  );
  for (const eventId of result.notify) {
    await notifyEventOpened(eventId).catch((error: unknown) => {
      console.error("Failed to send event opened notification", eventId, error);
    });
  }
  return Response.json(result);
}

export { handler as GET, handler as POST };
