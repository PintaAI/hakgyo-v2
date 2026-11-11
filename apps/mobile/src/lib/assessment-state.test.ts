import { describe, expect, test } from "bun:test";

import {
  assessmentAttemptPresentation,
  assessmentResultPolicy,
  assessmentTerminalResult,
  isStaleClosedOnDemandAssessment,
  latestStandaloneAttemptsByItem,
} from "./assessment-state";

describe("learner assessment state", () => {
  test("distinguishes work in progress, review, and a reviewed result", () => {
    expect(assessmentAttemptPresentation()).toEqual({
      detail: "Terbuka",
      action: "Mulai tugas",
    });

    expect(
      assessmentAttemptPresentation({
        status: "IN_PROGRESS",
        score: null,
        maxScore: null,
      }),
    ).toEqual({ detail: "Sedang dikerjakan", action: "Lanjutkan tugas" });

    expect(
      assessmentAttemptPresentation({
        status: "IN_REVIEW",
        score: null,
        maxScore: null,
      }),
    ).toEqual({ detail: "Menunggu review", action: "Lihat jawaban" });

    expect(
      assessmentAttemptPresentation({
        status: "GRADED",
        score: 8,
        maxScore: 10,
      }),
    ).toEqual({ detail: "Sudah direview · 8 / 10", action: "Lihat hasil" });
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

    const otherItem = { ...older, id: "attempt-other", courseItemId: "item-2" };
    const byItem = latestStandaloneAttemptsByItem([
      older,
      eventAttempt,
      newer,
      otherItem,
    ]);
    expect(byItem.get("item-1")?.id).toBe("attempt-newer");
    expect(byItem.get("item-2")?.id).toBe("attempt-other");
    expect(byItem.size).toBe(2);
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
