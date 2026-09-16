import { describe, expect, test } from "bun:test";

import {
  calculateStreak,
  findNewAchievements,
  getLocalCalendarWindow,
  getLocalDateKey,
  getRewardForAction,
  isValidTimeZone,
} from "./logic";

describe("gamification logic", () => {
  test("returns the configured reward for an activity", () => {
    expect(getRewardForAction("MATERIAL_COMPLETED")).toEqual({
      xp: 20,
      contributesToStreak: true,
    });
  });

  test("uses the learner timezone when resolving an activity day", () => {
    const activityAt = new Date("2026-08-29T23:30:00.000Z");

    expect(getLocalDateKey(activityAt, "UTC")).toBe("2026-08-29");
    expect(getLocalDateKey(activityAt, "Asia/Seoul")).toBe("2026-08-30");
    expect(isValidTimeZone("Asia/Seoul")).toBe(true);
    expect(isValidTimeZone("not/a-timezone")).toBe(false);
  });

  test("builds the current week from the learner's local day", () => {
    const now = new Date("2026-09-15T23:43:58.350Z");

    expect(getLocalCalendarWindow(now, "Asia/Jakarta")).toEqual({
      end: new Date("2026-09-21T00:00:00.000Z"),
      start: new Date("2026-09-14T00:00:00.000Z"),
      startsOn: "2026-09-14",
      today: "2026-09-16",
    });
  });

  test("deduplicates same-day activity and calculates current and longest streaks", () => {
    const summary = calculateStreak(
      [
        new Date("2026-08-24T10:00:00.000Z"),
        new Date("2026-08-25T10:00:00.000Z"),
        new Date("2026-08-27T10:00:00.000Z"),
        new Date("2026-08-28T08:00:00.000Z"),
        new Date("2026-08-28T18:00:00.000Z"),
        new Date("2026-08-29T10:00:00.000Z"),
      ],
      { now: new Date("2026-08-29T12:00:00.000Z"), timeZone: "UTC" },
    );

    expect(summary).toEqual({
      activeToday: true,
      currentStreak: 3,
      longestStreak: 3,
      lastActivityDate: "2026-08-29",
    });
  });

  test("keeps a streak alive through yesterday but resets after a missed day", () => {
    const activityDates = [
      new Date("2026-08-27T10:00:00.000Z"),
      new Date("2026-08-28T10:00:00.000Z"),
    ];

    expect(
      calculateStreak(activityDates, {
        now: new Date("2026-08-29T12:00:00.000Z"),
        timeZone: "UTC",
      }).currentStreak,
    ).toBe(2);

    expect(
      calculateStreak(activityDates, {
        now: new Date("2026-08-30T12:00:00.000Z"),
        timeZone: "UTC",
      }).currentStreak,
    ).toBe(0);
  });

  test("returns only newly earned achievements", () => {
    expect(
      findNewAchievements(
        {
          completedActivities: 12,
          currentStreak: 3,
          longestStreak: 5,
          totalXp: 120,
        },
        [
          {
            code: "FIRST_ACTIVITY",
            metric: "COMPLETED_ACTIVITIES",
            threshold: 1,
          },
          { code: "STREAK_3", metric: "CURRENT_STREAK", threshold: 3 },
          { code: "XP_500", metric: "TOTAL_XP", threshold: 500 },
        ],
        new Set(["FIRST_ACTIVITY"]),
      ),
    ).toEqual(["STREAK_3"]);
  });
});
