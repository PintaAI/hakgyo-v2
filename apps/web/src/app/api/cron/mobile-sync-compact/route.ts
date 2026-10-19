import { timingSafeEqual } from "node:crypto";

import { env } from "~/env";
import { db } from "~/server/db";
import { skipCronDuringMaintenance } from "~/server/maintenance";
import { compactMobileSyncLog } from "~/server/mobile/sync-log";

export const runtime = "nodejs";
// Runs under Fluid compute's default 300-second limit (vercel.json enables
// Fluid). Exporting `maxDuration` would split this route into its own Vercel
// function with its own cold starts, instead of sharing one with the other
// route handlers.

function isAuthorized(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Daily compaction entry point, called by the GitHub Actions workflow
 * `.github/workflows/mobile-sync-compact.yml` with
 * `Authorization: Bearer ${CRON_SECRET}`; the same header works for manual
 * runs with curl.
 */
async function handler(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const skipped = await skipCronDuringMaintenance();
  if (skipped) return skipped;
  const result = await compactMobileSyncLog(db);
  return Response.json(result);
}

export { handler as GET, handler as POST };
