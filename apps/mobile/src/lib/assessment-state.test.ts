import { describe, expect, test } from "bun:test";

import {
  assessmentAttemptPresentation,
  assessmentResultPolicy,
  assessmentTerminalResult,
  canReattemptAssessment,
  isStaleClosedOnDemandAssessment,
  latestStandaloneAttemptForItem,
} from "./assessment-state";

describe("learner assessment state", () => {
  test("distinguishes work in progress, review, and a reviewed result", () => {
    expect(assessmentAttemptPresentation()).toEqual({
      detail: "Open",
      action: "Start assessment",
    });

    expect(
      assessmentAttemptPresentation({
        status: "IN_PROGRESS",
        score: null,
        maxScore: null,
      }),
    ).toEqual({ detail: "In progress", action: "Resume assessment" });

    expect(
      assessmentAttemptPresentation({
        status: "IN_REVIEW",
        score: null,
        maxScore: null,
      }),
    ).toEqual({ detail: "Awaiting review", action: "View submission" });

    expect(
      assessmentAttemptPresentation({
        status: "GRADED",
        score: 8,
        maxScore: 10,
      }),
    ).toEqual({ detail: "Reviewed · 8 / 10", action: "View result" });
  });

  test("selects the newest built-in attempt without mixing in event attempts", () => {
    const older = {
      id: "attempt-older",
      courseItemId: "item-1",
      startedAt: new Date("2026-09-01T08:00:00Z"),
      assessmentEvent: null,
    };
    const newer = {
      id: "attempt-newer",
      courseItemId: "item-1",
      startedAt: new Date("2026-09-02T08:00:00Z"),
      assessmentEvent: null,
    };
    const eventAttempt = {
      id: "event-attempt",
      courseItemId: "item-1",
      startedAt: new Date("2026-09-03T08:00:00Z"),
      assessmentEvent: { id: "event-1" },
    };

    expect(
      latestStandaloneAttemptForItem([older, eventAttempt, newer], "item-1")
        ?.id,
    ).toBe("attempt-newer");
  });

  test("shows answer review by assessment context without exposing tryout answers", () => {
    expect(assessmentResultPolicy()).toEqual({
      showAnswerReview: true,
      showLeaderboard: false,
    });
    expect(assessmentResultPolicy("QUICK_ASSESSMENT")).toEqual({
      showAnswerReview: true,
      showLeaderboard: true,
    });
    expect(assessmentResultPolicy("TRYOUT")).toEqual({
      showAnswerReview: false,
      showLeaderboard: true,
    });
  });

  test("hides closed on-demand assessments after one day", () => {
    const now = new Date("2026-09-11T12:00:00Z").getTime();

    expect(
      isStaleClosedOnDemandAssessment(
        {
          type: "QUICK_ASSESSMENT",
          status: "CLOSED",
          closedAt: new Date("2026-09-10T11:59:59Z"),
        },
        now,
      ),
    ).toBe(true);
    expect(
      isStaleClosedOnDemandAssessment(
        {
          type: "QUICK_ASSESSMENT",
          status: "OPEN",
          closesAt: new Date("2026-09-10T11:59:59Z"),
          closedAt: null,
        },
        now,
      ),
    ).toBe(true);
    expect(
      isStaleClosedOnDemandAssessment(
        {
          type: "QUICK_ASSESSMENT",
          status: "CLOSED",
          closedAt: new Date("2026-09-10T12:00:00Z"),
        },
        now,
      ),
    ).toBe(false);
    expect(
      isStaleClosedOnDemandAssessment(
        {
          type: "TRYOUT",
          status: "CLOSED",
          closedAt: new Date("2026-09-01T12:00:00Z"),
        },
        now,
      ),
    ).toBe(false);
  });

  test("allows another standalone attempt only while attempts remain", () => {
    expect(
      canReattemptAssessment({
        attemptNumber: 1,
        maxAttempts: 2,
        eventType: null,
      }),
    ).toBe(true);
    expect(
      canReattemptAssessment({
        attemptNumber: 2,
        maxAttempts: 2,
        eventType: null,
      }),
    ).toBe(false);
    expect(
      canReattemptAssessment({
        attemptNumber: 20,
        maxAttempts: null,
        eventType: null,
      }),
    ).toBe(true);
    expect(
      canReattemptAssessment({
        attemptNumber: 1,
        maxAttempts: 2,
        eventType: "QUICK_ASSESSMENT",
      }),
    ).toBe(false);
  });

  test("derives terminal result data without mirroring query data into component state", () => {
    expect(
      assessmentTerminalResult({
        status: "IN_PROGRESS",
        score: null,
        maxScore: null,
      }),
    ).toBeUndefined();
    expect(
      assessmentTerminalResult({
        status: "SUBMITTED",
        score: null,
        maxScore: null,
      }),
    ).toEqual({ status: "IN_REVIEW", score: 0, maxScore: 0 });
    expect(
      assessmentTerminalResult({
        status: "GRADED",
        score: 8,
        maxScore: 10,
      }),
    ).toEqual({ status: "GRADED", score: 8, maxScore: 10 });
  });
});
