import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import {
  DEFAULT_COHORT_NAME,
  upsertDefaultCohortEnrollment,
} from "./default-cohort";

const expiresAt = new Date("2026-12-31T23:59:59.000Z");

function createDatabase(input: {
  defaultCohort: { id: string } | null;
  membershipExists: boolean;
}) {
  let defaultCohort = input.defaultCohort;
  const calls = {
    cohortCreates: [] as unknown[],
    membershipCreates: [] as unknown[],
    membershipUpdates: [] as unknown[],
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
    cohortEnrollment: {
      createMany: (args: { data: unknown }) => {
        calls.membershipCreates.push(args.data);
        return Promise.resolve({ count: input.membershipExists ? 0 : 1 });
      },
      updateMany: (args: unknown) => {
        calls.membershipUpdates.push(args);
        return Promise.resolve({ count: 1 });
      },
      findUniqueOrThrow: () => Promise.resolve({ id: "membership-1" }),
    },
  } as unknown as Prisma.TransactionClient;
  return { db, calls };
}

describe("default cohort membership", () => {
  test("creates the default cohort and joins a new learner", async () => {
    const { db, calls } = createDatabase({
      defaultCohort: null,
      membershipExists: false,
    });

    await upsertDefaultCohortEnrollment(db, {
      courseId: "course-1",
      userId: "user-1",
      create: { status: "ACTIVE", source: "MANUAL", expiresAt },
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
      {
        cohortId: "default-cohort",
        userId: "user-1",
        status: "ACTIVE",
        source: "MANUAL",
        expiresAt,
      },
    ]);
    expect(calls.membershipUpdates).toEqual([]);
  });

  test("updates an existing membership with the update data", async () => {
    const { db, calls } = createDatabase({
      defaultCohort: { id: "default-cohort" },
      membershipExists: true,
    });

    await upsertDefaultCohortEnrollment(db, {
      courseId: "course-1",
      userId: "user-1",
      create: { status: "ACTIVE", source: "INVITE" },
      update: { status: "COMPLETED" },
    });

    expect(calls.cohortCreates).toEqual([]);
    expect(calls.membershipUpdates).toEqual([
      {
        where: { cohortId: "default-cohort", userId: "user-1" },
        data: { status: "COMPLETED" },
      },
    ]);
  });

  test("leaves an existing membership alone when the update is empty", async () => {
    const { db, calls } = createDatabase({
      defaultCohort: { id: "default-cohort" },
      membershipExists: true,
    });

    await upsertDefaultCohortEnrollment(db, {
      courseId: "course-1",
      userId: "user-1",
      create: { status: "ACTIVE", source: "FOUNDATION" },
      update: {},
    });

    expect(calls.membershipUpdates).toEqual([]);
  });
});
