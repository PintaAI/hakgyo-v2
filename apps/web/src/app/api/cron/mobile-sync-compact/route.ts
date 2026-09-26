import { timingSafeEqual } from "node:crypto";

import { env } from "~/env";
import { db } from "~/server/db";
import { compactMobileSyncLog } from "~/server/mobile/sync-log";

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
 * Daily compaction entry point, called by the GitHub Actions workflow
 * `.github/workflows/mobile-sync-compact.yml` with
 * `Authorization: Bearer ${CRON_SECRET}`; the same header works for manual
 * runs with curl.
 */
async function handler(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await compactMobileSyncLog(db);
  return Response.json(result);
}

export { handler as GET, handler as POST };
