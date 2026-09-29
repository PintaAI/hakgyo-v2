import { describe, expect, test } from "bun:test";

import {
  formatMeetingTime,
  formatRelativeDuration,
} from "~/server/notifications/format";

describe("formatRelativeDuration", () => {
  test("rounds to minutes, hours, then days", () => {
    expect(formatRelativeDuration(0)).toBe("1 menit");
    expect(formatRelativeDuration(29.6 * 60_000)).toBe("30 menit");
    expect(formatRelativeDuration(90 * 60_000)).toBe("2 jam");
    expect(formatRelativeDuration(47 * 3_600_000)).toBe("47 jam");
    expect(formatRelativeDuration(72 * 3_600_000)).toBe("3 hari");
  });
});

describe("formatMeetingTime", () => {
  const startsAt = new Date("2026-10-05T12:00:00Z");

  test("uses the meeting time zone", () => {
    const text = formatMeetingTime(startsAt, "Asia/Jakarta");
    expect(text).toContain("19.00");
    expect(text).toContain("WIB");
  });

  test("falls back to UTC for an invalid zone", () => {
    expect(formatMeetingTime(startsAt, "Not/AZone")).toContain("12.00");
  });
});
