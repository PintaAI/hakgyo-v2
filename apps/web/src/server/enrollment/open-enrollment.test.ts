import { describe, expect, test } from "bun:test";

import {
  getOpenEnrollmentRejection,
  getOpenEnrollmentUpdate,
} from "./open-enrollment";

const openCourse = {
  status: "PUBLISHED" as const,
  price: 0,
  enrollmentMode: "OPEN" as const,
  organization: { defaultEnrollmentMode: "INVITE_ONLY" as const },
};

describe("open enrollment eligibility", () => {
  test("accepts a free published course with an open override", () => {
    expect(getOpenEnrollmentRejection(openCourse)).toBeNull();
  });

  test("uses the organization default when the course has no override", () => {
    expect(
      getOpenEnrollmentRejection({
        ...openCourse,
        enrollmentMode: null,
        organization: { defaultEnrollmentMode: "OPEN" },
      }),
    ).toBeNull();
  });

  test("rejects unpublished, invite-only, and paid courses", () => {
    expect(getOpenEnrollmentRejection({ ...openCourse, status: "DRAFT" })).toBe(
      "COURSE_NOT_PUBLISHED",
    );
    expect(
      getOpenEnrollmentRejection({
        ...openCourse,
        enrollmentMode: "INVITE_ONLY",
      }),
    ).toBe("INVITE_REQUIRED");
    expect(getOpenEnrollmentRejection({ ...openCourse, price: 1000 })).toBe(
      "PAYMENT_REQUIRED",
    );
  });
});

describe("open enrollment transitions", () => {
  const now = new Date("2026-08-15T00:00:00.000Z");

  test("keeps a current independent enrollment unchanged", () => {
    expect(
      getOpenEnrollmentUpdate(
        { status: "ACTIVE", source: "OPEN", expiresAt: null },
        now,
      ),
    ).toBeNull();
    expect(
      getOpenEnrollmentUpdate(
        {
          status: "COMPLETED",
          source: "INVITE",
          expiresAt: new Date("2026-08-16T00:00:00.000Z"),
        },
        now,
      ),
    ).toBeNull();
  });

  test("converts a cohort entitlement into independent open access", () => {
    expect(
      getOpenEnrollmentUpdate(
        { status: "COMPLETED", source: "COHORT", expiresAt: null },
        now,
      ),
    ).toEqual({ source: "OPEN", expiresAt: null });
  });

  test("reactivates expired, pending, and cancelled enrollments", () => {
    const expected = {
      status: "ACTIVE",
      source: "OPEN",
      completedAt: null,
      expiresAt: null,
    } as const;

    expect(
      getOpenEnrollmentUpdate(
        {
          status: "ACTIVE",
          source: "MANUAL",
          expiresAt: new Date("2026-08-14T00:00:00.000Z"),
        },
        now,
      ),
    ).toEqual(expected);
    expect(
      getOpenEnrollmentUpdate(
        { status: "PENDING", source: "INVITE", expiresAt: null },
        now,
      ),
    ).toEqual(expected);
    expect(
      getOpenEnrollmentUpdate(
        { status: "CANCELLED", source: "COHORT", expiresAt: null },
        now,
      ),
    ).toEqual(expected);
  });
});
