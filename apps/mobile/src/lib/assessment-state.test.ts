import { describe, expect, test } from "bun:test";

import {
  assessmentAttemptPresentation,
  assessmentResultPolicy,
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
});
