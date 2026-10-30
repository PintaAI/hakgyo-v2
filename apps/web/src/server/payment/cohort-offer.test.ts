import { describe, expect, test } from "bun:test";

import {
  effectiveCohortEnrollmentMode,
  effectiveCohortPrice,
  getCohortJoinBlocker,
  isCohortJoinable,
  lowestOpenCohortPrice,
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
  test("a class without a price is free", () => {
    expect(effectiveCohortPrice({ price: null })).toBe(0);
    expect(effectiveCohortPrice({ price: 250 })).toBe(250);
  });

  test("enrollment mode falls back from class to organization", () => {
    const organization = { defaultEnrollmentMode: "INVITE_ONLY" as const };
    expect(
      effectiveCohortEnrollmentMode({ enrollmentMode: null }, organization),
    ).toBe("INVITE_ONLY");
    expect(
      effectiveCohortEnrollmentMode({ enrollmentMode: "OPEN" }, organization),
    ).toBe("OPEN");
  });
});

describe("lowestOpenCohortPrice", () => {
  const organization = { defaultEnrollmentMode: "OPEN" as const };

  test("picks the cheapest open class, a class without a price as free", () => {
    expect(
      lowestOpenCohortPrice(
        [
          { price: 250, enrollmentMode: null },
          { price: null, enrollmentMode: "INVITE_ONLY" },
          { price: 100, enrollmentMode: "OPEN" },
        ],
        organization,
      ),
    ).toBe(100);
    expect(
      lowestOpenCohortPrice(
        [{ price: null, enrollmentMode: null }],
        organization,
      ),
    ).toBe(0);
  });

  test("is null when no class is open", () => {
    expect(lowestOpenCohortPrice([], organization)).toBeNull();
    expect(
      lowestOpenCohortPrice(
        [{ price: 100, enrollmentMode: "INVITE_ONLY" }],
        organization,
      ),
    ).toBeNull();
  });
});

describe("isCohortJoinable", () => {
  const cohort = { status: "OPEN", endsAt: null };

  test("accepts open and running classes, a Kelas Mandiri included", () => {
    expect(isCohortJoinable(cohort, now)).toBe(true);
    expect(isCohortJoinable({ ...cohort, status: "IN_PROGRESS" }, now)).toBe(
      true,
    );
  });

  test("rejects drafts, cancelled and ended classes", () => {
    expect(isCohortJoinable({ ...cohort, status: "DRAFT" }, now)).toBe(false);
    expect(isCohortJoinable({ ...cohort, status: "CANCELLED" }, now)).toBe(
      false,
    );
    expect(
      isCohortJoinable({ ...cohort, endsAt: new Date("2026-09-30") }, now),
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
