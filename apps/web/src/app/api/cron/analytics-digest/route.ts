import { timingSafeEqual } from "node:crypto";

import { env } from "~/env";
import { sendWeeklyAnalyticsDigests } from "~/server/analytics/weekly-digest";
import { db } from "~/server/db";
import { skipCronDuringMaintenance } from "~/server/maintenance";

export const runtime = "nodejs";
// Runs under Fluid compute's default 300-second limit, like the other cron
// routes, instead of exporting `maxDuration`.

function isAuthorized(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Weekly analytics digest, called on Monday morning (08:00 WIB) by the GitHub
 * Actions workflow `.github/workflows/analytics-digest.yml` with
 * `Authorization: Bearer ${CRON_SECRET}`. Safe to retry: members who already
 * received this week's digest are skipped.
 */
async function handler(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const skipped = await skipCronDuringMaintenance();
  if (skipped) return skipped;
  return Response.json(await sendWeeklyAnalyticsDigests(db));
}

export { handler as GET, handler as POST };
