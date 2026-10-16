/**
 * Reporting periods for workspace analytics. Every period is anchored to the
 * calendar in Asia/Jakarta (WIB), which is UTC+7 all year with no daylight
 * saving, so local days are plain fixed-offset arithmetic. Shared by the
 * server (queries) and the client (period picker and chart labels).
 */
export const ANALYTICS_TIME_ZONE = "Asia/Jakarta";
const LOCAL_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const analyticsPeriods = [
  "7h",
  "30h",
  "90h",
  "bulan-ini",
  "12b",
] as const;
export type AnalyticsPeriod = (typeof analyticsPeriods)[number];
export const defaultAnalyticsPeriod: AnalyticsPeriod = "30h";

export const analyticsPeriodLabels: Record<AnalyticsPeriod, string> = {
  "7h": "7 hari",
  "30h": "30 hari",
  "90h": "90 hari",
  "bulan-ini": "Bulan ini",
  "12b": "12 bulan",
};

/** What the previous period is called next to a change figure. */
export const analyticsComparisonLabels: Record<AnalyticsPeriod, string> = {
  "7h": "7 hari sebelumnya",
  "30h": "30 hari sebelumnya",
  "90h": "90 hari sebelumnya",
  "bulan-ini": "bulan lalu",
  "12b": "12 bulan sebelumnya",
};

export type AnalyticsGranularity = "day" | "week" | "month";

export type AnalyticsRange = {
  period: AnalyticsPeriod;
  granularity: AnalyticsGranularity;
  /** Inclusive start and exclusive end of the period, as instants. */
  start: Date;
  end: Date;
  /** The same stretch of time one period earlier, for change figures. */
  previousStart: Date;
  previousEnd: Date;
  /** Local bucket keys (`YYYY-MM-DD` of the bucket's first day), oldest first. */
  buckets: string[];
};

export function isAnalyticsPeriod(value: unknown): value is AnalyticsPeriod {
  return analyticsPeriods.some((period) => period === value);
}

export function parseAnalyticsPeriod(value: unknown): AnalyticsPeriod {
  const first = Array.isArray(value) ? (value[0] as unknown) : value;
  return isAnalyticsPeriod(first) ? first : defaultAnalyticsPeriod;
}

/** A local calendar date in WIB, held as a UTC-midnight Date. */
type LocalDate = Date;

function toLocalDate(instant: Date): LocalDate {
  const shifted = new Date(instant.getTime() + LOCAL_OFFSET_MS);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ),
  );
}

/** The instant a local date begins (00:00 WIB). */
function startOfLocalDate(date: LocalDate) {
  return new Date(date.getTime() - LOCAL_OFFSET_MS);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Shifts by whole months, clamping the day so 31 March minus one month is 28/29 February. */
function addMonths(date: Date, months: number) {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  target.setUTCHours(
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
  return target;
}

function dateKey(date: LocalDate) {
  return date.toISOString().slice(0, 10);
}

/** Monday of the local date's ISO week, matching Postgres `date_trunc('week')`. */
function startOfWeek(date: LocalDate) {
  const weekday = (date.getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

function startOfMonth(date: LocalDate) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function bucketStart(
  date: LocalDate,
  granularity: AnalyticsGranularity,
): LocalDate {
  if (granularity === "week") return startOfWeek(date);
  if (granularity === "month") return startOfMonth(date);
  return date;
}

function bucketKeys(
  first: LocalDate,
  last: LocalDate,
  granularity: AnalyticsGranularity,
) {
  const keys: string[] = [];
  let cursor = bucketStart(first, granularity);
  while (cursor.getTime() <= last.getTime()) {
    keys.push(dateKey(cursor));
    cursor =
      granularity === "month"
        ? addMonths(cursor, 1)
        : addDays(cursor, granularity === "week" ? 7 : 1);
  }
  return keys;
}

/**
 * Resolves a period to concrete bounds at `now`. Day-based periods end today
 * and start N-1 local days earlier; "bulan ini" starts on the 1st and "12b"
 * on the 1st of the month eleven months back. The comparison period covers
 * the same elapsed time one period earlier, so a period in progress is never
 * compared against a complete one.
 */
export function resolveAnalyticsRange(
  period: AnalyticsPeriod,
  now: Date = new Date(),
): AnalyticsRange {
  const today = toLocalDate(now);
  let firstDay: LocalDate;
  let granularity: AnalyticsGranularity;
  let shift: (date: Date) => Date;

  switch (period) {
    case "7h":
    case "30h":
    case "90h": {
      const days = period === "7h" ? 7 : period === "30h" ? 30 : 90;
      firstDay = addDays(today, -(days - 1));
      granularity = period === "90h" ? "week" : "day";
      shift = (date) => addDays(date, -days);
      break;
    }
    case "bulan-ini":
      firstDay = startOfMonth(today);
      granularity = "day";
      shift = (date) => addMonths(date, -1);
      break;
    case "12b":
      firstDay = addMonths(startOfMonth(today), -11);
      granularity = "month";
      shift = (date) => addMonths(date, -12);
      break;
  }

  const start = startOfLocalDate(firstDay);
  const previousStart = startOfLocalDate(shift(firstDay));
  const previousEnd = new Date(Math.min(shift(now).getTime(), start.getTime()));

  return {
    period,
    granularity,
    start,
    end: now,
    previousStart,
    previousEnd,
    buckets: bucketKeys(firstDay, today, granularity),
  };
}

/**
 * Lines query rows up with the period's buckets, filling gaps with `empty`
 * so charts show quiet days instead of skipping them.
 */
export function fillBuckets<Row extends { bucket: string }, Value>(
  buckets: readonly string[],
  rows: readonly Row[],
  pick: (row: Row | undefined) => Value,
): Array<{ bucket: string } & Value> {
  const byBucket = new Map(rows.map((row) => [row.bucket, row]));
  return buckets.map((bucket) => ({ bucket, ...pick(byBucket.get(bucket)) }));
}

/**
 * Relative change from the previous period, or null when there is nothing to
 * compare against (a previous value of zero).
 */
export function relativeChange(current: number, previous: number) {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

const shortDay = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const shortMonth = new Intl.DateTimeFormat("id-ID", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});
const longDay = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const longMonth = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Axis label for a bucket key. */
export function formatBucketLabel(
  bucket: string,
  granularity: AnalyticsGranularity,
) {
  const date = new Date(`${bucket}T00:00:00.000Z`);
  return granularity === "month"
    ? shortMonth.format(date)
    : shortDay.format(date);
}

/** Tooltip label for a bucket key, naming the whole week or month. */
export function formatBucketTitle(
  bucket: string,
  granularity: AnalyticsGranularity,
) {
  const date = new Date(`${bucket}T00:00:00.000Z`);
  if (granularity === "month") return longMonth.format(date);
  if (granularity === "week") {
    return `${shortDay.format(date)} – ${longDay.format(addDays(date, 6))}`;
  }
  return longDay.format(date);
}
