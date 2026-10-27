import { describe, expect, test } from "bun:test";
import type { Prisma } from "../../../generated/prisma/client";

import {
  isPassingScore,
  recordAssessmentPassed,
  recordAssessmentSubmitted,
} from "./attempt";

type CreatedActivity = {
  action: string;
  activityDate: Date;
  idempotencyKey: string;
  metadata: unknown;
  organizationId: string;
  occurredAt: Date;
  userId: string;
  xpAwarded: number;
};

/** A transaction double that records inserted activity events. */
function fakeTransaction(storedTimeZone: string | null) {
  const created: CreatedActivity[] = [];
  const tx = {
    $queryRaw: () => Promise.resolve([]),
    userActivityEvent: {
      createMany: (args: { data: CreatedActivity[] }) => {
        created.push(...args.data);
        return Promise.resolve({ count: args.data.length });
      },
    },
    userAchievement: {
      createMany: () => Promise.resolve({ count: 0 }),
      findMany: () => Promise.resolve([]),
    },
    userGamification: {
      findUnique: () =>
        Promise.resolve(storedTimeZone ? { timeZone: storedTimeZone } : null),
      upsert: () =>
        Promise.resolve({
          completedActivities: 1,
          currentStreak: 1,
          longestStreak: 1,
          totalXp: 0,
        }),
    },
  } as unknown as Prisma.TransactionClient;
  return { created, tx };
}

const attempt = {
  id: "attempt-1",
  userId: "user-1",
  organizationId: "organization-1",
  courseItemId: "item-1",
};

describe("recordAssessmentSubmitted", () => {
  test("awards the submission once per attempt, dated in the stored time zone", async () => {
    const { created, tx } = fakeTransaction("Asia/Jakarta");

    await recordAssessmentSubmitted(
      tx,
      { ...attempt, assessmentEventId: "event-1" },
      new Date("2026-09-15T23:43:58.350Z"),
    );

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      action: "ASSESSMENT_SUBMITTED",
      activityDate: new Date("2026-09-16T00:00:00.000Z"),
      idempotencyKey: "assessment-submitted:attempt-1",
      metadata: {
        attemptId: "attempt-1",
        courseItemId: "item-1",
        assessmentEventId: "event-1",
      },
      organizationId: "organization-1",
      userId: "user-1",
      xpAwarded: 10,
    });
  });

  test("omits the event from the metadata of a standalone attempt", async () => {
    const { created, tx } = fakeTransaction(null);

    await recordAssessmentSubmitted(
      tx,
      { ...attempt, assessmentEventId: null },
      new Date("2026-09-15T23:43:58.350Z"),
    );

    expect(created[0]?.metadata).toEqual({
      attemptId: "attempt-1",
      courseItemId: "item-1",
    });
    expect(created[0]?.activityDate).toEqual(
      new Date("2026-09-15T00:00:00.000Z"),
    );
  });
});

describe("recordAssessmentPassed", () => {
  test("keys the pass by learner and course item so retakes share it", async () => {
    const { created, tx } = fakeTransaction("UTC");
    const passedAt = new Date("2026-09-15T08:00:00.000Z");

    await recordAssessmentPassed(tx, attempt, passedAt);
    await recordAssessmentPassed(tx, { ...attempt, id: "attempt-2" }, passedAt);

    expect(created.map(({ idempotencyKey }) => idempotencyKey)).toEqual([
      "assessment-passed:user-1:item-1",
      "assessment-passed:user-1:item-1",
    ]);
    expect(created[0]).toMatchObject({
      action: "ASSESSMENT_PASSED",
      metadata: { attemptId: "attempt-1", courseItemId: "item-1" },
      organizationId: "organization-1",
      occurredAt: passedAt,
      xpAwarded: 40,
    });
  });
});

describe("isPassingScore", () => {
  test("requires the passing percentage and a positive maximum", () => {
    expect(isPassingScore(7, 10, 70)).toBe(true);
    expect(isPassingScore(6, 10, 70)).toBe(false);
    expect(isPassingScore(0, 10, null)).toBe(true);
    expect(isPassingScore(0, 0, null)).toBe(false);
    expect(isPassingScore(5, null, null)).toBe(false);
  });

  test("counts fractional scores exactly at the threshold", () => {
    // 24 EPS-TOPIK questions at 2.5 points reach the manufacturing floor of 60.
    let score = 0;
    for (let index = 0; index < 24; index += 1) score += 2.5;
    expect(isPassingScore(score, 100, 60)).toBe(true);
    // (72.5 / 125) * 100 is 57.99999999999999 in floating point.
    expect(isPassingScore(72.5, 125, 58)).toBe(true);
    expect(isPassingScore(57.5, 100, 60)).toBe(false);
  });
});
