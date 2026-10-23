import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import {
  awardHangeulMasteryIfComplete,
  isCourseComplete,
  type CourseCompletionItem,
} from "./hangeul-mastery-completion";

const material = (id: string): CourseCompletionItem => ({
  id,
  type: "MATERIAL",
  assessment: null,
});
const quiz = (
  id: string,
  assessmentId: string,
  passingScore: number | null = 70,
): CourseCompletionItem => ({
  id,
  type: "ASSESSMENT",
  assessment: { id: assessmentId, passingScore },
});
const graded = (score: number, maxScore = 10) => ({
  status: "GRADED",
  score,
  maxScore,
});

describe("isCourseComplete", () => {
  test("an empty course is never complete", () => {
    expect(
      isCourseComplete([], {
        completedItemIds: new Set(),
        attemptsByAssessment: new Map(),
      }),
    ).toBe(false);
  });

  test("needs completed progress for every non-assessment item", () => {
    const items = [material("m1"), material("v1")];
    expect(
      isCourseComplete(items, {
        completedItemIds: new Set(["m1"]),
        attemptsByAssessment: new Map(),
      }),
    ).toBe(false);
    expect(
      isCourseComplete(items, {
        completedItemIds: new Set(["m1", "v1"]),
        attemptsByAssessment: new Map(),
      }),
    ).toBe(true);
  });

  test("assessments count only through a passing graded attempt", () => {
    const items = [material("m1"), quiz("q1", "a1")];
    const completedItemIds = new Set(["m1", "q1"]);
    expect(
      isCourseComplete(items, {
        completedItemIds,
        attemptsByAssessment: new Map([["a1", [graded(5)]]]),
      }),
    ).toBe(false);
    expect(
      isCourseComplete(items, {
        completedItemIds: new Set(["m1"]),
        attemptsByAssessment: new Map([["a1", [graded(5), graded(8)]]]),
      }),
    ).toBe(true);
  });

  test("an assessment item without an assessment never completes", () => {
    expect(
      isCourseComplete([{ id: "q1", type: "ASSESSMENT", assessment: null }], {
        completedItemIds: new Set(["q1"]),
        attemptsByAssessment: new Map(),
      }),
    ).toBe(false);
  });
});

function createTx(input: {
  inCourse: boolean;
  earned?: boolean;
  courseStatus?: string;
  items: CourseCompletionItem[];
  completed: string[];
}) {
  const calls = {
    achievements: [] as unknown[],
    enrollmentUpdates: [] as unknown[],
    itemQueries: 0,
    lookups: 0,
    // The order of the lock and the progress reads.
    sequence: [] as string[],
  };
  const tx = {
    $queryRaw: () => {
      calls.sequence.push("lock");
      return Promise.resolve([]);
    },
    courseItem: {
      findFirst: () => {
        calls.lookups += 1;
        return Promise.resolve(input.inCourse ? { id: "x" } : null);
      },
      findMany: () => {
        calls.itemQueries += 1;
        return Promise.resolve(input.items);
      },
    },
    userAchievement: {
      findUnique: () => {
        calls.sequence.push("achievement");
        return Promise.resolve(input.earned ? { id: "ach" } : null);
      },
      createMany: (args: unknown) => {
        calls.achievements.push(args);
        return Promise.resolve({ count: 1 });
      },
    },
    course: {
      findUnique: () =>
        Promise.resolve({ status: input.courseStatus ?? "PUBLISHED" }),
    },
    contentProgress: {
      findMany: () => {
        calls.sequence.push("progress");
        return Promise.resolve(
          input.completed.map((courseItemId) => ({ courseItemId })),
        );
      },
    },
    assessmentAttempt: { findMany: () => Promise.resolve([]) },
    cohortEnrollment: {
      updateMany: (args: unknown) => {
        calls.enrollmentUpdates.push(args);
        return Promise.resolve({ count: 1 });
      },
    },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, calls };
}

describe("awardHangeulMasteryIfComplete", () => {
  const now = new Date("2026-10-22T03:00:00.000Z");

  test("returns early for items of other courses", async () => {
    const { tx, calls } = createTx({
      inCourse: false,
      items: [material("m1")],
      completed: ["m1"],
    });
    const result = await awardHangeulMasteryIfComplete(tx, {
      userId: "u1",
      courseItemIds: ["m1"],
      now,
    });
    expect(result.awarded).toBe(false);
    expect(calls.itemQueries).toBe(0);
    expect(calls.sequence).toEqual([]);
  });

  test("skips every query when the caller names another course", async () => {
    const { tx, calls } = createTx({
      inCourse: true,
      items: [material("m1")],
      completed: ["m1"],
    });
    const result = await awardHangeulMasteryIfComplete(tx, {
      userId: "u1",
      courseItemIds: ["m1"],
      courseId: "another-course",
      now,
    });
    expect(result.awarded).toBe(false);
    expect(calls.lookups).toBe(0);
    expect(calls.sequence).toEqual([]);
  });

  test("trusts a Hangeul course id from the caller", async () => {
    const { tx, calls } = createTx({
      inCourse: false,
      items: [material("m1")],
      completed: ["m1"],
    });
    const result = await awardHangeulMasteryIfComplete(tx, {
      userId: "u1",
      courseItemIds: ["m1"],
      courseId: "hakgyo-foundation-hangeul-mastery",
      now,
    });
    expect(result.awarded).toBe(true);
    expect(calls.lookups).toBe(0);
  });

  test("takes the learner's progress lock before reading progress", async () => {
    const { tx, calls } = createTx({
      inCourse: true,
      items: [material("m1")],
      completed: ["m1"],
    });
    await awardHangeulMasteryIfComplete(tx, {
      userId: "u1",
      courseItemIds: ["m1"],
      now,
    });
    expect(calls.sequence).toEqual(["lock", "achievement", "progress"]);
  });

  test("does nothing while an item is still open", async () => {
    const { tx, calls } = createTx({
      inCourse: true,
      items: [material("m1"), material("m2")],
      completed: ["m1"],
    });
    const result = await awardHangeulMasteryIfComplete(tx, {
      userId: "u1",
      courseItemIds: ["m1"],
      now,
    });
    expect(result.awarded).toBe(false);
    expect(calls.achievements).toEqual([]);
    expect(calls.enrollmentUpdates).toEqual([]);
  });

  test("awards the badge and completes the default membership", async () => {
    const { tx, calls } = createTx({
      inCourse: true,
      items: [material("m1"), material("m2")],
      completed: ["m1", "m2"],
    });
    const result = await awardHangeulMasteryIfComplete(tx, {
      userId: "u1",
      courseItemIds: ["m2"],
      now,
    });
    expect(result.awarded).toBe(true);
    expect(calls.achievements).toEqual([
      {
        data: {
          userId: "u1",
          code: "HANGEUL_MASTERY",
          earnedAt: now,
          metadata: { courseId: "hakgyo-foundation-hangeul-mastery" },
        },
        skipDuplicates: true,
      },
    ]);
    expect(calls.enrollmentUpdates).toEqual([
      {
        where: {
          userId: "u1",
          status: "ACTIVE",
          cohort: { defaultForCourseId: "hakgyo-foundation-hangeul-mastery" },
        },
        data: { status: "COMPLETED", completedAt: now },
      },
    ]);
  });

  test("is idempotent once the badge is earned", async () => {
    const { tx, calls } = createTx({
      inCourse: true,
      earned: true,
      items: [material("m1")],
      completed: ["m1"],
    });
    const result = await awardHangeulMasteryIfComplete(tx, {
      userId: "u1",
      courseItemIds: ["m1"],
      now,
    });
    expect(result.awarded).toBe(false);
    expect(calls.itemQueries).toBe(0);
    expect(calls.achievements).toEqual([]);
  });

  test("skips an unpublished course", async () => {
    const { tx, calls } = createTx({
      inCourse: true,
      courseStatus: "DRAFT",
      items: [material("m1")],
      completed: ["m1"],
    });
    await awardHangeulMasteryIfComplete(tx, {
      userId: "u1",
      courseItemIds: ["m1"],
      now,
    });
    expect(calls.achievements).toEqual([]);
  });
});
