import { describe, expect, test } from "bun:test";

import { getStreakStage, getWeeklyProgressDays } from "./learning-progress";

describe("learning progress streak stage", () => {
  test("replaces the stage after every seven streak days", () => {
    expect(getStreakStage(0)).toEqual({ progress: 0, tone: "green", week: 1 });
    expect(getStreakStage(7)).toEqual({ progress: 7, tone: "green", week: 1 });
    expect(getStreakStage(8)).toEqual({ progress: 1, tone: "yellow", week: 2 });
    expect(getStreakStage(14)).toEqual({
      progress: 7,
      tone: "yellow",
      week: 2,
    });
    expect(getStreakStage(15)).toEqual({ progress: 1, tone: "red", week: 3 });
    expect(getStreakStage(29)).toEqual({ progress: 1, tone: "red", week: 5 });
  });
});

test("builds a Monday-to-Sunday activity calendar", () => {
  expect(
    getWeeklyProgressDays({
      activeDates: ["2026-09-07", "2026-09-09"],
      startsOn: "2026-09-07",
      today: "2026-09-09",
    }),
  ).toEqual([
    {
      active: true,
      dateKey: "2026-09-07",
      dateNumber: 7,
      future: false,
      today: false,
      weekday: "Mon",
    },
    {
      active: false,
      dateKey: "2026-09-08",
      dateNumber: 8,
      future: false,
      today: false,
      weekday: "Tue",
    },
    {
      active: true,
      dateKey: "2026-09-09",
      dateNumber: 9,
      future: false,
      today: true,
      weekday: "Wed",
    },
    {
      active: false,
      dateKey: "2026-09-10",
      dateNumber: 10,
      future: true,
      today: false,
      weekday: "Thu",
    },
    {
      active: false,
      dateKey: "2026-09-11",
      dateNumber: 11,
      future: true,
      today: false,
      weekday: "Fri",
    },
    {
      active: false,
      dateKey: "2026-09-12",
      dateNumber: 12,
      future: true,
      today: false,
      weekday: "Sat",
    },
    {
      active: false,
      dateKey: "2026-09-13",
      dateNumber: 13,
      future: true,
      today: false,
      weekday: "Sun",
    },
  ]);
});
