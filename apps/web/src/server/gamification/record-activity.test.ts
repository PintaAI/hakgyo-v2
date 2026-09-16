import { describe, expect, test } from "bun:test";
import type { Prisma } from "../../../generated/prisma/client";

import { recordGamificationActivity } from "./record-activity";

describe("recordGamificationActivity", () => {
  test("uses and persists a newly reported learner timezone", async () => {
    let createdEvent: { data: Array<{ activityDate: Date }> } | undefined;
    let updatedSummary:
      { update: { timeZone: string; currentStreak: number } } | undefined;
    const tx = {
      userActivityEvent: {
        createMany: (args: { data: Array<{ activityDate: Date }> }) => {
          createdEvent = args;
          return Promise.resolve({ count: 1 });
        },
        findMany: () =>
          Promise.resolve([
            { activityDate: new Date("2026-09-15T00:00:00.000Z") },
            { activityDate: new Date("2026-09-16T00:00:00.000Z") },
          ]),
      },
      userAchievement: {
        createMany: () => Promise.resolve({ count: 0 }),
        findMany: () => Promise.resolve([]),
      },
      userGamification: {
        findUnique: () => Promise.resolve({ timeZone: "UTC" }),
        upsert: (args: {
          update: { timeZone: string; currentStreak: number };
        }) => {
          updatedSummary = args;
          return Promise.resolve({
            completedActivities: 2,
            currentStreak: args.update.currentStreak,
            longestStreak: 2,
            totalXp: 10,
          });
        },
      },
    } as unknown as Prisma.TransactionClient;

    const result = await recordGamificationActivity(tx, {
      action: "VOCABULARY_REVIEWED",
      idempotencyKey: "practice-vocabulary-card:user-1:review-2",
      organizationId: "organization-1",
      occurredAt: new Date("2026-09-15T23:43:58.350Z"),
      timeZone: "Asia/Jakarta",
      userId: "user-1",
    });

    expect(createdEvent?.data[0]?.activityDate).toEqual(
      new Date("2026-09-16T00:00:00.000Z"),
    );
    expect(updatedSummary?.update).toMatchObject({
      currentStreak: 2,
      timeZone: "Asia/Jakarta",
    });
    expect(result).toMatchObject({
      awarded: true,
      summary: { currentStreak: 2 },
    });
  });

  test("starts a one-day streak after the first vocabulary review", async () => {
    let currentStreak: number | undefined;
    const tx = {
      userActivityEvent: {
        createMany: () => Promise.resolve({ count: 1 }),
        findMany: () =>
          Promise.resolve([
            { activityDate: new Date("2026-09-15T00:00:00.000Z") },
          ]),
      },
      userAchievement: {
        createMany: () => Promise.resolve({ count: 0 }),
        findMany: () => Promise.resolve([]),
      },
      userGamification: {
        findUnique: () => Promise.resolve({ timeZone: "UTC" }),
        upsert: (args: { create: { currentStreak: number } }) => {
          currentStreak = args.create.currentStreak;
          return Promise.resolve({
            completedActivities: 1,
            currentStreak,
            longestStreak: currentStreak,
            totalXp: 5,
          });
        },
      },
    } as unknown as Prisma.TransactionClient;

    const result = await recordGamificationActivity(tx, {
      action: "VOCABULARY_REVIEWED",
      idempotencyKey: "practice-vocabulary-card:user-1:review-1",
      organizationId: "organization-1",
      occurredAt: new Date("2026-09-15T12:00:00.000Z"),
      userId: "user-1",
    });

    expect(currentStreak).toBe(1);
    expect(result).toMatchObject({
      awarded: true,
      summary: { currentStreak: 1 },
      xpAwarded: 5,
    });
  });

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
      organizationId: "organization-1",
      occurredAt: new Date("2026-08-29T12:00:00.000Z"),
      userId: "user-1",
    });

    expect(createdEvents).toEqual([
      expect.objectContaining({
        data: [expect.objectContaining({ organizationId: "organization-1" })],
      }),
    ]);
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
      organizationId: "organization-1",
      userId: "user-1",
    });

    expect(result).toEqual({ awarded: false });
    expect(summaryWasUpdated).toBe(false);
  });
});
