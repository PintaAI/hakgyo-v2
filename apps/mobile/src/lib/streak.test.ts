import { describe, expect, test } from "bun:test";

import { getStreakProgressDays } from "./streak";

describe("weekly streak days", () => {
  test("marks only activity dates in the displayed week", () => {
    const days = getStreakProgressDays({
      activeDates: ["2026-09-13", "2026-09-14", "2026-09-16"],
      startsOn: "2026-09-14",
      today: "2026-09-16",
    });

    expect(
      days.map(({ weekday, dateKey, active }) => ({
        weekday,
        dateKey,
        active,
      })),
    ).toEqual([
      { weekday: "Mon", dateKey: "2026-09-14", active: true },
      { weekday: "Tue", dateKey: "2026-09-15", active: false },
      { weekday: "Wed", dateKey: "2026-09-16", active: true },
      { weekday: "Thu", dateKey: "2026-09-17", active: false },
      { weekday: "Fri", dateKey: "2026-09-18", active: false },
      { weekday: "Sat", dateKey: "2026-09-19", active: false },
      { weekday: "Sun", dateKey: "2026-09-20", active: false },
    ]);
    expect(days.map(({ today, future }) => ({ today, future }))).toEqual([
      { today: false, future: false },
      { today: false, future: false },
      { today: true, future: false },
      { today: false, future: true },
      { today: false, future: true },
      { today: false, future: true },
      { today: false, future: true },
    ]);
  });

  test("keeps calendar dates correct across the year boundary", () => {
    const days = getStreakProgressDays({
      activeDates: ["2026-01-01"],
      startsOn: "2025-12-29",
      today: "2026-01-01",
    });

    expect(days.map((day) => day.dateNumber)).toEqual([29, 30, 31, 1, 2, 3, 4]);
    expect(days[3]).toMatchObject({
      active: true,
      dateKey: "2026-01-01",
      today: true,
      weekday: "Thu",
    });
  });
});
