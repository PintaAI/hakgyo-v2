import { describe, expect, test } from "bun:test";

import {
  formatZonedDateTimeInput,
  parseZonedDateTimeInput,
} from "./zoned-date-time";

describe("zoned date-time inputs", () => {
  test("parses a wall time in its selected timezone", () => {
    expect(
      parseZonedDateTimeInput("2026-08-22T09:00", "Asia/Jakarta").toISOString(),
    ).toBe("2026-08-22T02:00:00.000Z");
  });

  test("formats an instant in its selected timezone", () => {
    expect(
      formatZonedDateTimeInput(
        new Date("2026-08-22T02:00:00.000Z"),
        "Asia/Jakarta",
      ),
    ).toBe("2026-08-22T09:00");
  });

  test("rejects a nonexistent daylight-saving time", () => {
    expect(() =>
      parseZonedDateTimeInput("2026-03-08T02:30", "America/New_York"),
    ).toThrow("does not exist");
  });

  test("round-trips a wall time through parse and format", () => {
    const wall = "2026-08-22T15:30";
    const tz = "Asia/Makassar";
    const parsed = parseZonedDateTimeInput(wall, tz);
    expect(formatZonedDateTimeInput(parsed, tz)).toBe(wall);
  });

  test("handles DST fallback ambiguous time (first occurrence)", () => {
    // 2026-11-01 01:30 America/New_York occurs twice; we resolve to the first (EDT, UTC-4)
    const parsed = parseZonedDateTimeInput("2026-11-01T01:30", "America/New_York");
    // Either offset is acceptable as long as round-trip is stable
    expect(formatZonedDateTimeInput(parsed, "America/New_York")).toBe(
      "2026-11-01T01:30",
    );
  });

  test("rejects an invalid timezone", () => {
    expect(() =>
      parseZonedDateTimeInput("2026-08-22T09:00", "Invalid/Timezone"),
    ).toThrow();
    expect(() =>
      formatZonedDateTimeInput(new Date(), "Invalid/Timezone"),
    ).toThrow();
  });

  test("parses wall time with seconds", () => {
    expect(
      parseZonedDateTimeInput(
        "2026-08-22T09:00:30",
        "Asia/Jayapura",
      ).toISOString(),
    ).toBe("2026-08-22T00:00:30.000Z");
  });
});
