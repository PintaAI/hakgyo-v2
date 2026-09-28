import { describe, expect, test } from "bun:test";

import {
  courseAccessMembershipWhere,
  courseAccessWhere,
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
});
