import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import {
  courseAccessMembershipWhere,
  courseAccessWhere,
  findOtherRunningClass,
  learnerClassCohortWhere,
  liveClassCohortWhere,
} from "./cohort-access";

const now = new Date("2026-08-17T00:00:00.000Z");

describe("cohort-derived course access", () => {
  test("grants access through unexpired memberships of non-draft cohorts", () => {
    expect(courseAccessMembershipWhere("user-1", now)).toEqual({
      userId: "user-1",
      status: { in: ["ACTIVE", "COMPLETED"] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      cohort: { status: { in: ["OPEN", "IN_PROGRESS", "COMPLETED"] } },
    });
  });

  test("keeps access after a class cohort ends", () => {
    const where = courseAccessMembershipWhere("user-1", now);
    expect(where.cohort).not.toHaveProperty("endsAt");
    expect(where.cohort).not.toHaveProperty("OR");
  });

  test("filters courses by a membership granting access", () => {
    expect(courseAccessWhere("user-1", now)).toEqual({
      cohorts: {
        some: {
          status: { in: ["OPEN", "IN_PROGRESS", "COMPLETED"] },
          enrollments: {
            some: {
              userId: "user-1",
              status: { in: ["ACTIVE", "COMPLETED"] },
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
          },
        },
      },
    });
  });

  test("limits live class views to running class cohorts", () => {
    expect(liveClassCohortWhere(now)).toEqual({
      defaultForCourseId: null,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    });
  });

  test("lists running classes and active Kelas Mandiri memberships on Belajar", () => {
    const membership = {
      userId: "user-1",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };
    expect(learnerClassCohortWhere("user-1", now)).toEqual({
      OR: [
        {
          defaultForCourseId: null,
          status: { in: ["OPEN", "IN_PROGRESS"] },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          enrollments: {
            some: { ...membership, status: { in: ["ACTIVE", "COMPLETED"] } },
          },
        },
        {
          defaultForCourseId: { not: null },
          status: { in: ["OPEN", "IN_PROGRESS", "COMPLETED"] },
          enrollments: { some: { ...membership, status: "ACTIVE" } },
        },
      ],
    });
  });

  test("leaves out the Kelas Mandiri of hidden courses only", () => {
    const where = learnerClassCohortWhere("user-1", now, {
      hiddenKelasMandiriCourseIds: ["hangeul"],
    });
    expect(where.OR[0]?.defaultForCourseId).toBeNull();
    expect(where.OR[1]?.defaultForCourseId).toEqual({
      not: null,
      notIn: ["hangeul"],
    });
  });
});

describe("other running class", () => {
  function createDatabase() {
    const lookups: Array<{ where: Record<string, unknown> }> = [];
    const db = {
      cohortEnrollment: {
        findFirst: (args: { where: Record<string, unknown> }) => {
          lookups.push(args);
          return Promise.resolve({
            cohort: { id: "class-1", name: "Kelas Pagi" },
          });
        },
      },
    } as unknown as Prisma.TransactionClient;
    return { db, lookups };
  }

  test("skips the class being joined", async () => {
    const { db, lookups } = createDatabase();
    await findOtherRunningClass(db, {
      cohortId: "class-2",
      courseId: "course-1",
      userId: "user-1",
      now,
    });
    expect(lookups[0]?.where.cohortId).toEqual({ not: "class-2" });
  });

  test("counts any running class when joining the Kelas Mandiri", async () => {
    const { db, lookups } = createDatabase();
    const otherClass = await findOtherRunningClass(db, {
      courseId: "course-1",
      userId: "user-1",
      now,
    });
    expect(otherClass).toEqual({ id: "class-1", name: "Kelas Pagi" });
    expect(lookups[0]?.where).not.toHaveProperty("cohortId");
    expect(lookups[0]?.where.cohort).toEqual({
      courseId: "course-1",
      ...liveClassCohortWhere(now),
    });
  });
});
