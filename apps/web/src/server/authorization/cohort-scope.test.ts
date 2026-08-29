import { describe, expect, test } from "bun:test";

import { getOrganizationCohortScope } from "./cohort-scope";

describe("organization cohort scope", () => {
  test("does not narrow owner and admin organization queries", () => {
    expect(
      getOrganizationCohortScope({
        membershipId: "member-1",
        permissionMode: "ADVANCED",
        role: "ADMIN",
      }),
    ).toEqual({});
  });

  test("limits simple teachers to exact cohort assignments", () => {
    expect(
      getOrganizationCohortScope({
        membershipId: "teacher-1",
        permissionMode: "SIMPLE",
        role: "TEACHER",
      }),
    ).toEqual({
      staff: { some: { organizationMemberId: "teacher-1" } },
    });
  });

  test("includes owned-course cohorts and assignments for advanced teachers", () => {
    expect(
      getOrganizationCohortScope({
        membershipId: "teacher-1",
        permissionMode: "ADVANCED",
        role: "TEACHER",
      }),
    ).toEqual({
      OR: [
        { course: { ownerMembershipId: "teacher-1" } },
        { staff: { some: { organizationMemberId: "teacher-1" } } },
      ],
    });
  });
});
