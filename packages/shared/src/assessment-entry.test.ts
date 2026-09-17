import { describe, expect, test } from "bun:test";

import { resolveAssessmentEntry } from "./assessment-entry";

describe("resolveAssessmentEntry", () => {
  test("sends a learner who has never started to details", () => {
    expect(
      resolveAssessmentEntry({
        attemptsUsed: 0,
        maxAttempts: 2,
        available: true,
      }),
    ).toEqual({
      state: "NOT_STARTED",
      destination: "DETAIL",
      canStart: true,
      canReattempt: false,
    });
  });

  test("sends an in-progress learner directly to the attempt", () => {
    expect(
      resolveAssessmentEntry({
        attemptStatus: "IN_PROGRESS",
        attemptsUsed: 1,
        maxAttempts: 2,
        available: true,
      }),
    ).toEqual({
      state: "IN_PROGRESS",
      destination: "ATTEMPT",
      canStart: false,
      canReattempt: false,
    });
  });

  test.each(["SUBMITTED", "IN_REVIEW", "GRADED"] as const)(
    "keeps %s on details and permits another attempt when available",
    (attemptStatus) => {
      expect(
        resolveAssessmentEntry({
          attemptStatus,
          attemptsUsed: 1,
          maxAttempts: 2,
          available: true,
        }),
      ).toMatchObject({
        state: attemptStatus,
        destination: "DETAIL",
        canStart: false,
        canReattempt: true,
      });
    },
  );

  test("blocks starts and re-attempts when closed, invalidated, or exhausted", () => {
    expect(
      resolveAssessmentEntry({
        attemptsUsed: 0,
        maxAttempts: null,
        available: false,
      }).canStart,
    ).toBeFalse();
    expect(
      resolveAssessmentEntry({
        attemptStatus: "IN_PROGRESS",
        attemptsUsed: 1,
        maxAttempts: 2,
        available: true,
        invalidated: true,
      }),
    ).toMatchObject({
      destination: "DETAIL",
      canStart: false,
      canReattempt: false,
    });
    expect(
      resolveAssessmentEntry({
        attemptStatus: "GRADED",
        attemptsUsed: 1,
        maxAttempts: 2,
        available: true,
        invalidated: true,
      }).canReattempt,
    ).toBeFalse();
    expect(
      resolveAssessmentEntry({
        attemptStatus: "GRADED",
        attemptsUsed: 2,
        maxAttempts: 2,
        available: true,
      }).canReattempt,
    ).toBeFalse();
  });
});
