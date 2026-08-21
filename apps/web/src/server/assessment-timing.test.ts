import { describe, expect, test } from "bun:test";

import {
  getAssessmentDeadline,
  isAssessmentExpired,
} from "./assessment-timing";

const startedAt = new Date("2026-08-20T10:00:00.000Z");

describe("assessment deadlines", () => {
  test("keeps saves valid before the deadline", () => {
    expect(
      isAssessmentExpired(startedAt, 30, new Date("2026-08-20T10:29:59.999Z")),
    ).toBe(false);
  });

  test("treats the exact deadline as expired", () => {
    const deadline = getAssessmentDeadline(startedAt, 30);
    expect(deadline?.toISOString()).toBe("2026-08-20T10:30:00.000Z");
    expect(isAssessmentExpired(startedAt, 30, deadline!)).toBe(true);
  });

  test("rejects saves after the deadline", () => {
    expect(
      isAssessmentExpired(startedAt, 30, new Date("2026-08-20T10:30:00.001Z")),
    ).toBe(true);
  });

  test("does not expire unlimited assessments", () => {
    expect(
      isAssessmentExpired(startedAt, null, new Date("2099-01-01T00:00:00Z")),
    ).toBe(false);
    expect(getAssessmentDeadline(startedAt, null)).toBeNull();
  });
});
