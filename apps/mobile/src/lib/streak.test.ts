import { describe, expect, test } from "bun:test";

import {
  getStreakLabel,
  getStreakProgressDays,
  getStreakStage,
} from "./streak";

describe("streak stage", () => {
  test("labels the actual consecutive day count", () => {
    expect(getStreakLabel(0)).toBe("0 day streak");
    expect(getStreakLabel(1)).toBe("1 day streak");
    expect(getStreakLabel(2)).toBe("2 day streak");
  });

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

describe("streak progress days", () => {
  test("keeps all weekdays green when a Tuesday streak reaches Monday", () => {
    const days = getStreakProgressDays({
      activeDates: ["2026-09-14"],
      currentStreak: 7,
      startsOn: "2026-09-14",
      today: "2026-09-14",
    });

    expect(
      days.map(({ active, dateKey, tone, weekday }) => ({
        active,
        dateKey,
        tone,
        weekday,
      })),
    ).toEqual([
      { active: true, dateKey: "2026-09-14", tone: "green", weekday: "Mon" },
      { active: true, dateKey: "2026-09-08", tone: "green", weekday: "Tue" },
      { active: true, dateKey: "2026-09-09", tone: "green", weekday: "Wed" },
      { active: true, dateKey: "2026-09-10", tone: "green", weekday: "Thu" },
      { active: true, dateKey: "2026-09-11", tone: "green", weekday: "Fri" },
      { active: true, dateKey: "2026-09-12", tone: "green", weekday: "Sat" },
      { active: true, dateKey: "2026-09-13", tone: "green", weekday: "Sun" },
    ]);
  });

  test("promotes only Tuesday when the streak reaches its second Tuesday", () => {
    const days = getStreakProgressDays({
      activeDates: ["2026-09-14", "2026-09-15"],
      currentStreak: 8,
      startsOn: "2026-09-14",
      today: "2026-09-15",
    });

    expect(days.map((day) => day.tone)).toEqual([
      "green",
      "yellow",
      "green",
      "green",
      "green",
      "green",
      "green",
    ]);
    expect(days.find((day) => day.weekday === "Tue")).toMatchObject({
      active: true,
      dateKey: "2026-09-15",
      today: true,
      tone: "yellow",
    });
  });

  test("resets the bubbles when the continuous streak is broken", () => {
    expect(
      getStreakProgressDays({
        activeDates: [],
        currentStreak: 0,
        startsOn: "2026-09-14",
        today: "2026-09-16",
      }).map(({ active, future, tone, today }) => ({
        active,
        future,
        tone,
        today,
      })),
    ).toEqual([
      { active: false, future: false, tone: null, today: false },
      { active: false, future: false, tone: null, today: false },
      { active: false, future: false, tone: null, today: true },
      { active: false, future: true, tone: null, today: false },
      { active: false, future: true, tone: null, today: false },
      { active: false, future: true, tone: null, today: false },
      { active: false, future: true, tone: null, today: false },
    ]);
  });
});
