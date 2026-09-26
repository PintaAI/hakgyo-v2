import type { Prisma } from "../../../generated/prisma/client";

import type { StreakRun } from "./logic";

/**
 * Consecutive-day runs of the learner's streak activity (gaps-and-islands over the distinct
 * `activityDate`s). Served from the (userId, contributesToStreak, activityDate) index and returns
 * one row per run instead of every activity event.
 */
export function loadStreakRuns(
  db: Pick<Prisma.TransactionClient, "$queryRaw">,
  userId: string,
): Promise<StreakRun[]> {
  return db.$queryRaw<StreakRun[]>`
    SELECT
      MIN(day) AS "startsOn",
      MAX(day) AS "endsOn",
      COUNT(*)::integer AS "length"
    FROM (
      SELECT day, day - (ROW_NUMBER() OVER (ORDER BY day))::integer AS run
      FROM (
        SELECT DISTINCT "activityDate" AS day
        FROM "UserActivityEvent"
        WHERE "userId" = ${userId} AND "contributesToStreak" = true
      ) AS days
    ) AS numbered
    GROUP BY run
  `;
}
