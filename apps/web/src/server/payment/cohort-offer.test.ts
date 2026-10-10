import { describe, expect, test } from "bun:test";

import {
  effectiveCohortEnrollmentMode,
  effectiveCohortPrice,
  getCohortJoinBlocker,
  isCohortJoinable,
} from "./cohort-offer";

const now = new Date("2026-10-01T00:00:00Z");
const open = {
  joinable: true,
  coursePublished: true,
  enrollmentMode: "OPEN" as const,
  hasValidInvite: false,
  alreadyEnrolled: false,
  inOtherClass: false,
  capacity: null,
  memberCount: 0,
  price: 350000,
  hasPaymentMethod: true,
};

describe("effective cohort settings", () => {
  test("cohort price overrides the course price, including free", () => {
    expect(effectiveCohortPrice({ price: null }, { price: 100 })).toBe(100);
    expect(effectiveCohortPrice({ price: 0 }, { price: 100 })).toBe(0);
    expect(effectiveCohortPrice({ price: 250 }, { price: 100 })).toBe(250);
  });

  test("enrollment mode falls back from cohort to course to organization", () => {
    const organization = { defaultEnrollmentMode: "INVITE_ONLY" as const };
    expect(
      effectiveCohortEnrollmentMode(
        { enrollmentMode: null },
        { enrollmentMode: null },
        organization,
      ),
    ).toBe("INVITE_ONLY");
    expect(
      effectiveCohortEnrollmentMode(
        { enrollmentMode: null },
        { enrollmentMode: "OPEN" },
        organization,
      ),
    ).toBe("OPEN");
    expect(
      effectiveCohortEnrollmentMode(
        { enrollmentMode: "INVITE_ONLY" },
        { enrollmentMode: "OPEN" },
        organization,
      ),
    ).toBe("INVITE_ONLY");
  });
});

describe("isCohortJoinable", () => {
  const cohort = { status: "OPEN", endsAt: null, defaultForCourseId: null };

  test("accepts open and running class cohorts", () => {
    expect(isCohortJoinable(cohort, now)).toBe(true);
    expect(isCohortJoinable({ ...cohort, status: "IN_PROGRESS" }, now)).toBe(
      true,
    );
  });

  test("rejects drafts, ended and default cohorts", () => {
    expect(isCohortJoinable({ ...cohort, status: "DRAFT" }, now)).toBe(false);
    expect(
      isCohortJoinable({ ...cohort, endsAt: new Date("2026-09-30") }, now),
    ).toBe(false);
    expect(
      isCohortJoinable({ ...cohort, defaultForCourseId: "course_1" }, now),
    ).toBe(false);
  });
});

describe("getCohortJoinBlocker", () => {
  test("allows an open paid cohort with a payment method", () => {
    expect(getCohortJoinBlocker(open)).toBeNull();
  });

  test("an invite opens an invite-only cohort", () => {
    expect(
      getCohortJoinBlocker({ ...open, enrollmentMode: "INVITE_ONLY" }),
    ).toBe("INVITE_REQUIRED");
    expect(
      getCohortJoinBlocker({
        ...open,
        enrollmentMode: "INVITE_ONLY",
        hasValidInvite: true,
      }),
    ).toBeNull();
  });

  test("full cohorts and unconfigured payments block checkout", () => {
    expect(getCohortJoinBlocker({ ...open, capacity: 2, memberCount: 2 })).toBe(
      "FULL",
    );
    expect(getCohortJoinBlocker({ ...open, hasPaymentMethod: false })).toBe(
      "PAYMENT_NOT_CONFIGURED",
    );
    expect(
      getCohortJoinBlocker({ ...open, price: 0, hasPaymentMethod: false }),
    ).toBeNull();
  });

  test("members and unavailable cohorts are reported first", () => {
    expect(getCohortJoinBlocker({ ...open, alreadyEnrolled: true })).toBe(
      "ALREADY_ENROLLED",
    );
    expect(getCohortJoinBlocker({ ...open, inOtherClass: true })).toBe(
      "IN_OTHER_CLASS",
    );
    expect(
      getCohortJoinBlocker({
        ...open,
        alreadyEnrolled: true,
        inOtherClass: true,
      }),
    ).toBe("ALREADY_ENROLLED");
    expect(getCohortJoinBlocker({ ...open, coursePublished: false })).toBe(
      "COHORT_UNAVAILABLE",
    );
  });
});
