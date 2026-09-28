import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import {
  DEFAULT_COHORT_NAME,
  syncDefaultCohortEnrollments,
} from "./default-cohort";

const enrolledAt = new Date("2026-08-17T00:00:00.000Z");
const expiresAt = new Date("2026-12-31T23:59:59.000Z");

const mirrored = {
  status: "ACTIVE",
  source: "MANUAL",
  enrolledAt,
  completedAt: null,
  expiresAt,
};

function directEnrollment(userId: string) {
  return { userId, ...mirrored };
}

function createDatabase(input: {
  direct: ReturnType<typeof directEnrollment>[];
  defaultCohort: { id: string } | null;
}) {
  let defaultCohort = input.defaultCohort;
  const calls = {
    cohortCreates: [] as unknown[],
    membershipCreates: [] as unknown[],
    membershipUpdates: [] as unknown[],
    membershipDeletes: [] as unknown[],
  };
  const db = {
    course: {
      findUniqueOrThrow: () =>
        Promise.resolve({ organizationId: "organization-1" }),
    },
    cohort: {
      findUnique: () => Promise.resolve(defaultCohort),
      findUniqueOrThrow: () => Promise.resolve(defaultCohort),
      createMany: (args: { data: unknown }) => {
        calls.cohortCreates.push(args.data);
        defaultCohort = { id: "default-cohort" };
        return Promise.resolve({ count: 1 });
      },
    },
    courseEnrollment: {
      findMany: () => Promise.resolve(input.direct),
    },
    cohortEnrollment: {
      createMany: (args: { data: unknown[] }) => {
        calls.membershipCreates.push(...args.data);
        return Promise.resolve({ count: args.data.length });
      },
      updateMany: (args: unknown) => {
        calls.membershipUpdates.push(args);
        return Promise.resolve({ count: 1 });
      },
      deleteMany: (args: unknown) => {
        calls.membershipDeletes.push(args);
        return Promise.resolve({ count: 1 });
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { db, calls };
}

describe("default cohort sync", () => {
  test("creates the default cohort and mirrors a direct enrollment", async () => {
    const { db, calls } = createDatabase({
      direct: [directEnrollment("user-1")],
      defaultCohort: null,
    });

    await syncDefaultCohortEnrollments(db, {
      courseId: "course-1",
      userIds: ["user-1"],
    });

    expect(calls.cohortCreates).toEqual([
      {
        courseId: "course-1",
        organizationId: "organization-1",
        name: DEFAULT_COHORT_NAME,
        status: "OPEN",
        defaultForCourseId: "course-1",
      },
    ]);
    expect(calls.membershipCreates).toEqual([
      { cohortId: "default-cohort", userId: "user-1", ...mirrored },
    ]);
    expect(calls.membershipUpdates).toEqual([
      {
        where: { cohortId: "default-cohort", userId: "user-1" },
        data: mirrored,
      },
    ]);
    expect(calls.membershipDeletes).toEqual([]);
  });

  test("removes memberships no longer backed by a direct enrollment", async () => {
    const { db, calls } = createDatabase({
      direct: [directEnrollment("user-1")],
      defaultCohort: { id: "default-cohort" },
    });

    await syncDefaultCohortEnrollments(db, {
      courseId: "course-1",
      userIds: ["user-1", "user-2"],
    });

    expect(calls.cohortCreates).toEqual([]);
    expect(calls.membershipDeletes).toEqual([
      { where: { cohortId: "default-cohort", userId: { in: ["user-2"] } } },
    ]);
  });

  test("does not create a default cohort without direct enrollments", async () => {
    const { db, calls } = createDatabase({ direct: [], defaultCohort: null });

    await syncDefaultCohortEnrollments(db, {
      courseId: "course-1",
      userIds: ["user-1"],
    });

    expect(calls).toEqual({
      cohortCreates: [],
      membershipCreates: [],
      membershipUpdates: [],
      membershipDeletes: [],
    });
  });
});
