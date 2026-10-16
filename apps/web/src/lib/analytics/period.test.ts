import { describe, expect, test } from "bun:test";

import {
  fillBuckets,
  formatBucketTitle,
  parseAnalyticsPeriod,
  relativeChange,
  resolveAnalyticsRange,
} from "./period";

// 14 Oct 2026, 10:00 WIB.
const now = new Date("2026-10-14T03:00:00.000Z");

describe("resolveAnalyticsRange", () => {
  test("30 days ends now and starts at local midnight 29 days back", () => {
    const range = resolveAnalyticsRange("30h", now);
    expect(range.granularity).toBe("day");
    // 15 Sep 00:00 WIB is 14 Sep 17:00 UTC.
    expect(range.start.toISOString()).toBe("2026-09-14T17:00:00.000Z");
    expect(range.end).toBe(now);
    expect(range.buckets).toHaveLength(30);
    expect(range.buckets[0]).toBe("2026-09-15");
    expect(range.buckets.at(-1)).toBe("2026-10-14");
    expect(range.previousStart.toISOString()).toBe("2026-08-15T17:00:00.000Z");
    expect(range.previousEnd.toISOString()).toBe("2026-09-14T03:00:00.000Z");
  });

  test("uses the WIB date when UTC is still on the previous day", () => {
    // 14 Oct 2026 23:30 UTC is 15 Oct 06:30 WIB.
    const range = resolveAnalyticsRange("7h", new Date("2026-10-14T23:30:00Z"));
    expect(range.buckets.at(-1)).toBe("2026-10-15");
    expect(range.buckets[0]).toBe("2026-10-09");
  });

  test("90 days groups by ISO week starting on Monday", () => {
    const range = resolveAnalyticsRange("90h", now);
    expect(range.granularity).toBe("week");
    // The range starts on Thu 16 Jul; its week began on Mon 13 Jul.
    expect(range.buckets[0]).toBe("2026-07-13");
    expect(range.buckets.at(-1)).toBe("2026-10-12");
    expect(range.buckets).toHaveLength(14);
  });

  test("this month compares with the same elapsed time last month", () => {
    const range = resolveAnalyticsRange("bulan-ini", now);
    expect(range.start.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(range.buckets).toHaveLength(14);
    expect(range.previousStart.toISOString()).toBe("2026-08-31T17:00:00.000Z");
    expect(range.previousEnd.toISOString()).toBe("2026-09-14T03:00:00.000Z");
  });

  test("this month clamps the comparison at the end of a shorter month", () => {
    const range = resolveAnalyticsRange(
      "bulan-ini",
      new Date("2026-03-31T05:00:00Z"),
    );
    expect(range.previousEnd.toISOString()).toBe("2026-02-28T05:00:00.000Z");
  });

  test("12 months buckets by month from eleven months back", () => {
    const range = resolveAnalyticsRange("12b", now);
    expect(range.granularity).toBe("month");
    expect(range.buckets).toHaveLength(12);
    expect(range.buckets[0]).toBe("2025-11-01");
    expect(range.buckets.at(-1)).toBe("2026-10-01");
    expect(range.previousStart.toISOString()).toBe("2024-10-31T17:00:00.000Z");
  });

  test("the comparison period never overlaps the current one", () => {
    for (const period of ["7h", "30h", "90h", "bulan-ini", "12b"] as const) {
      const range = resolveAnalyticsRange(period, now);
      expect(range.previousEnd.getTime()).toBeLessThanOrEqual(
        range.start.getTime(),
      );
      expect(range.previousStart.getTime()).toBeLessThan(
        range.previousEnd.getTime(),
      );
    }
  });
});

describe("helpers", () => {
  test("parseAnalyticsPeriod falls back to 30 days", () => {
    expect(parseAnalyticsPeriod("12b")).toBe("12b");
    expect(parseAnalyticsPeriod(["7h", "30h"])).toBe("7h");
    expect(parseAnalyticsPeriod("1y")).toBe("30h");
    expect(parseAnalyticsPeriod(undefined)).toBe("30h");
  });

  test("fillBuckets fills missing buckets", () => {
    const rows = [{ bucket: "2026-10-02", total: 5 }];
    expect(
      fillBuckets(["2026-10-01", "2026-10-02"], rows, (row) => ({
        total: row?.total ?? 0,
      })),
    ).toEqual([
      { bucket: "2026-10-01", total: 0 },
      { bucket: "2026-10-02", total: 5 },
    ]);
  });

  test("relativeChange has no value without a previous figure", () => {
    expect(relativeChange(15, 10)).toBe(0.5);
    expect(relativeChange(5, 10)).toBe(-0.5);
    expect(relativeChange(5, 0)).toBeNull();
  });

  test("week titles name the whole week", () => {
    expect(formatBucketTitle("2026-10-12", "week")).toBe(
      "12 Okt – 18 Oktober 2026",
    );
  });
});
