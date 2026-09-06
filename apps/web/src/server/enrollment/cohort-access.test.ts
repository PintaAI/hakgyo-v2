import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import {
  reconcileCohortCourseAccess,
  removeCohortEnrollmentAndReconcile,
} from "./cohort-access";

describe("cohort-derived course access", () => {
  test("cancels access when no other active cohort grants it", async () => {
    const updates: unknown[] = [];
    const tx = {
      cohortEnrollment: {
        findMany: () => Promise.resolve([]),
      },
      courseEnrollment: {
        updateMany: (input: unknown) => {
          updates.push(input);
          return Promise.resolve({ count: 1 });
        },
      },
    } as unknown as Prisma.TransactionClient;

    await reconcileCohortCourseAccess(tx, {
      courseId: "course-1",
      userIds: ["user-1"],
    });

    expect(updates).toEqual([
      {
        where: {
          courseId: "course-1",
          userId: { in: ["user-1"] },
          source: "COHORT",
        },
        data: { status: "CANCELLED", completedAt: null },
      },
    ]);
  });

  test("keeps access while another active cohort grants it", async () => {
    let updateCount = 0;
    const tx = {
      cohortEnrollment: {
        findMany: () => Promise.resolve([{ userId: "user-1" }]),
      },
      courseEnrollment: {
        updateMany: () => {
          updateCount += 1;
          return Promise.resolve({ count: 1 });
        },
      },
    } as unknown as Prisma.TransactionClient;

    await reconcileCohortCourseAccess(tx, {
      courseId: "course-1",
      userIds: ["user-1"],
    });

    expect(updateCount).toBe(0);
  });

  test("removes the cohort enrollment before reconciling course access", async () => {
    const calls: string[] = [];
    const tx = {
      cohortEnrollment: {
        deleteMany: () => {
          calls.push("delete-cohort-enrollment");
          return Promise.resolve({ count: 1 });
        },
        findMany: () => {
          calls.push("check-other-cohort-access");
          return Promise.resolve([]);
        },
      },
      courseEnrollment: {
        updateMany: () => {
          calls.push("revoke-cohort-course-access");
          return Promise.resolve({ count: 1 });
        },
      },
    } as unknown as Prisma.TransactionClient;

    const result = await removeCohortEnrollmentAndReconcile(tx, {
      cohortId: "cohort-1",
      courseId: "course-1",
      userId: "user-1",
    });

    expect(result).toEqual({ count: 1 });
    expect(calls).toEqual([
      "delete-cohort-enrollment",
      "check-other-cohort-access",
      "revoke-cohort-course-access",
    ]);
  });
});
