import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import { reconcileCohortCourseAccess } from "./cohort-access";

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
});
