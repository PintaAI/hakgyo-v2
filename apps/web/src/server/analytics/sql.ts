import { Prisma } from "../../../generated/prisma/client";
import {
  ANALYTICS_TIME_ZONE,
  type AnalyticsGranularity,
} from "~/lib/analytics/period";

/**
 * The local (WIB) bucket a timestamp column falls in, as `YYYY-MM-DD` of the
 * bucket's first day. Prisma stores `DateTime` as UTC `timestamp without time
 * zone`, so the value is read as UTC before converting to local time.
 */
export function localBucket(
  column: Prisma.Sql,
  granularity: AnalyticsGranularity,
) {
  return Prisma.sql`to_char(date_trunc(${granularity}, (${column} AT TIME ZONE 'UTC') AT TIME ZONE ${ANALYTICS_TIME_ZONE}), 'YYYY-MM-DD')`;
}

/** Postgres aggregates come back as bigint or numeric; charts want numbers. */
export function toNumber(value: bigint | number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

/** A 0–1 ratio from a count and a total, or null when there is no total. */
export function ratio(part: number, whole: number) {
  return whole > 0 ? part / whole : null;
}
