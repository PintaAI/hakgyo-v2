import { describe, expect, test } from "bun:test";

import type { LearnerIndex } from "../sync/types";
import {
  applyVocabularyReward,
  localDateKey,
  VOCABULARY_REVIEW_XP,
} from "./optimistic-gamification";

type Gamification = LearnerIndex["gamification"];

function gamification(overrides: {
  activeDates?: string[];
  currentStreak?: number;
  lastActivityDate?: string | null;
  today?: string;
}): Gamification {
  const lastActivityDate =
    overrides.lastActivityDate === undefined
      ? null
      : overrides.lastActivityDate === null
        ? null
        : new Date(`${overrides.lastActivityDate}T00:00:00.000Z`);
  return {
    achievements: [],
    recentActivity: [],
    profileStats: {
      assessmentAttempts: 0,
      modulesMastered: 0,
      totalXp: 100,
      vocabularyMastered: 0,
    },
    summary: {
      completedActivities: 0,
      currentStreak: overrides.currentStreak ?? 0,
      lastActivityDate,
      longestStreak: 3,
      timeZone: "Asia/Jakarta",
      totalXp: 100,
      updatedAt: null,
    },
    weeklyActivity: {
      activeDates: overrides.activeDates ?? [],
      startsOn: "2026-09-21",
      today: overrides.today ?? "2026-09-23",
      xp: 20,
    },
  } as unknown as Gamification;
}

describe("applyVocabularyReward", () => {
  test("marks today active and extends a streak anchored on yesterday", () => {
    const next = applyVocabularyReward(
      gamification({
        activeDates: ["2026-09-22"],
        currentStreak: 2,
        lastActivityDate: "2026-09-22",
      }),
      "2026-09-23",
    );
    expect(next.weeklyActivity.activeDates).toEqual([
      "2026-09-22",
      "2026-09-23",
    ]);
    expect(next.summary.currentStreak).toBe(3);
    expect(next.weeklyActivity.xp).toBe(20 + VOCABULARY_REVIEW_XP);
    expect(next.summary.totalXp).toBe(100 + VOCABULARY_REVIEW_XP);
    expect(next.profileStats.totalXp).toBe(100 + VOCABULARY_REVIEW_XP);
  });

  test("keeps the streak once today is already active but still adds XP", () => {
    const next = applyVocabularyReward(
      gamification({
        activeDates: ["2026-09-23"],
        currentStreak: 4,
        lastActivityDate: "2026-09-23",
      }),
      "2026-09-23",
    );
    expect(next.summary.currentStreak).toBe(4);
    expect(next.weeklyActivity.activeDates).toEqual(["2026-09-23"]);
    expect(next.weeklyActivity.xp).toBe(20 + VOCABULARY_REVIEW_XP);
  });

  test("starts a new streak after a missed day", () => {
    const next = applyVocabularyReward(
      gamification({ currentStreak: 5, lastActivityDate: "2026-09-20" }),
      "2026-09-23",
    );
    expect(next.summary.currentStreak).toBe(1);
  });

  test("continues a streak across the week boundary", () => {
    const next = applyVocabularyReward(
      gamification({
        currentStreak: 6,
        lastActivityDate: "2026-09-20",
        today: "2026-09-21",
      }),
      "2026-09-21",
    );
    expect(next.summary.currentStreak).toBe(7);
    expect(next.weeklyActivity.activeDates).toEqual(["2026-09-21"]);
  });

  test("leaves a summary from another week for the server to refresh", () => {
    const before = gamification({ currentStreak: 2 });
    expect(applyVocabularyReward(before, "2026-09-28")).toBe(before);
  });
});

describe("localDateKey", () => {
  test("uses the attempt time zone", () => {
    const instant = new Date("2026-09-23T20:00:00.000Z");
    expect(localDateKey(instant, "Asia/Jakarta")).toBe("2026-09-24");
    expect(localDateKey(instant, "UTC")).toBe("2026-09-23");
  });
});
