import { describe, expect, test } from "bun:test";
import type { Prisma } from "../../../generated/prisma/client";

import { recordGamificationActivity } from "./record-activity";

describe("recordGamificationActivity", () => {
  test("awards XP, updates the summary, and creates eligible achievements", async () => {
    const createdEvents: unknown[] = [];
    const createdAchievements: unknown[] = [];
    const tx = {
      userActivityEvent: {
        createMany: (args: unknown) => {
          createdEvents.push(args);
          return Promise.resolve({ count: 1 });
        },
        findMany: () =>
          Promise.resolve([
            { activityDate: new Date("2026-08-27T00:00:00.000Z") },
            { activityDate: new Date("2026-08-28T00:00:00.000Z") },
            { activityDate: new Date("2026-08-29T00:00:00.000Z") },
          ]),
      },
      userAchievement: {
        createMany: (args: unknown) => {
          createdAchievements.push(args);
          return Promise.resolve({ count: 2 });
        },
        findMany: () => Promise.resolve([]),
      },
      userGamification: {
        findUnique: () => Promise.resolve(null),
        upsert: () =>
          Promise.resolve({
            completedActivities: 1,
            currentStreak: 3,
            longestStreak: 3,
            totalXp: 20,
          }),
      },
    } as unknown as Prisma.TransactionClient;

    const result = await recordGamificationActivity(tx, {
      action: "MATERIAL_COMPLETED",
      idempotencyKey: "content-completed:user-1:item-1",
      occurredAt: new Date("2026-08-29T12:00:00.000Z"),
      userId: "user-1",
    });

    expect(result).toEqual({
      awarded: true,
      newAchievementCodes: ["FIRST_ACTIVITY", "STREAK_3"],
      summary: {
        completedActivities: 1,
        currentStreak: 3,
        longestStreak: 3,
        totalXp: 20,
      },
      xpAwarded: 20,
    });
    expect(createdEvents).toHaveLength(1);
    expect(createdAchievements).toHaveLength(1);
  });

  test("does not award a duplicate activity", async () => {
    let summaryWasUpdated = false;
    const tx = {
      userActivityEvent: {
        createMany: () => Promise.resolve({ count: 0 }),
      },
      userGamification: {
        findUnique: () => Promise.resolve({ timeZone: "UTC" }),
        upsert: () => {
          summaryWasUpdated = true;
          return Promise.resolve({});
        },
      },
    } as unknown as Prisma.TransactionClient;

    const result = await recordGamificationActivity(tx, {
      action: "MATERIAL_COMPLETED",
      idempotencyKey: "content-completed:user-1:item-1",
      userId: "user-1",
    });

    expect(result).toEqual({ awarded: false });
    expect(summaryWasUpdated).toBe(false);
  });
});
