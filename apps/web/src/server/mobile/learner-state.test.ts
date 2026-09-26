import { describe, expect, mock, test } from "bun:test";

import { vocabularyContentHash } from "~/server/vocabulary/progress-policy";

import { buildLearnerState, type LearnerStateDb } from "./learner-state";

const now = new Date("2026-09-26T10:00:00.000Z");

function fakeDb() {
  const progress = mock(() =>
    Promise.resolve([
      {
        courseItemId: "item-1",
        status: "COMPLETED",
        startedAt: new Date("2026-09-01T00:00:00.000Z"),
        completedAt: new Date("2026-09-02T00:00:00.000Z"),
      },
    ]),
  );
  const attempts = mock((args: { where: Record<string, unknown> }) =>
    Promise.resolve(
      "assessmentId" in args.where
        ? [
            // Requirement evidence: an event attempt without a score counts.
            {
              assessmentId: "assess-req",
              status: "GRADED",
              score: null,
              maxScore: null,
            },
          ]
        : "status" in args.where
          ? [
              {
                assessmentId: "assess-1",
                status: "GRADED",
                score: 8,
                maxScore: 10,
              },
              {
                assessmentId: "assess-1",
                status: "GRADED",
                score: 3,
                maxScore: 10,
              },
            ]
          : [
              {
                courseItemId: "item-assess",
                id: "attempt-2",
                attemptNumber: 2,
                status: "IN_PROGRESS",
                score: null,
                maxScore: null,
                startedAt: new Date("2026-09-20T00:00:00.000Z"),
                submittedAt: null,
                gradedAt: null,
              },
              {
                courseItemId: "item-assess",
                id: "attempt-1",
                attemptNumber: 1,
                status: "GRADED",
                score: 8,
                maxScore: 10,
                startedAt: new Date("2026-09-10T00:00:00.000Z"),
                submittedAt: new Date("2026-09-10T00:30:00.000Z"),
                gradedAt: new Date("2026-09-10T00:31:00.000Z"),
              },
            ],
    ),
  );
  const requirements = mock(() =>
    Promise.resolve([
      {
        type: "VOCABULARY_SET",
        vocabularySetId: "set-practiced",
        assessmentId: null,
      },
      {
        type: "VOCABULARY_SET",
        vocabularySetId: "set-new",
        assessmentId: null,
      },
      { type: "ASSESSMENT", vocabularySetId: null, assessmentId: "assess-req" },
      {
        type: "ASSESSMENT",
        vocabularySetId: null,
        assessmentId: "assess-unattempted",
      },
    ]),
  );
  const entries = mock(() =>
    Promise.resolve([
      {
        id: "e1",
        vocabularySetId: "set-practiced",
        term: "t",
        definition: "d",
        progress: [
          {
            contentHash: hashOf("t", "d"),
            practicedAt: new Date("2026-09-01T00:00:00.000Z"),
            masteredAt: null,
            nextReviewAt: null,
            correctRecallCount: 1,
          },
        ],
      },
      {
        id: "e2",
        vocabularySetId: "set-new",
        term: "t",
        definition: "d",
        progress: [],
      },
    ]),
  );
  const cohorts = mock(() =>
    Promise.resolve([
      { cohort: { id: "cohort-1", name: "Cohort 1", courseId: "course-1" } },
    ]),
  );
  return {
    db: {
      contentProgress: { findMany: progress },
      assessmentAttempt: { findMany: attempts },
      materialRequirement: { findMany: requirements },
      vocabularyEntry: { findMany: entries },
      material: {},
      cohortEnrollment: { findMany: cohorts },
    } as unknown as LearnerStateDb,
    progress,
    attempts,
    requirements,
    entries,
    cohorts,
  };
}

function hashOf(term: string, definition: string) {
  return vocabularyContentHash({ term, definition });
}

describe("buildLearnerState", () => {
  test("returns an empty state without courses and without querying", async () => {
    const { db, progress } = fakeDb();
    expect(await buildLearnerState(db, "user", [], now)).toEqual({
      courseIds: [],
      contentProgress: {},
      standaloneAttempts: {},
      passEvidence: {},
      requirementEvidence: {},
      practicedVocabularySetIds: [],
      eligibleCohortsByCourse: {},
    });
    expect(progress).not.toHaveBeenCalled();
  });

  test("serializes per-user state for the requested courses", async () => {
    const { db, progress, attempts } = fakeDb();
    const state = await buildLearnerState(
      db,
      "user",
      ["course-1", "course-1"],
      now,
    );
    expect(state).toEqual({
      courseIds: ["course-1"],
      contentProgress: {
        "item-1": {
          status: "COMPLETED",
          startedAt: "2026-09-01T00:00:00.000Z",
          completedAt: "2026-09-02T00:00:00.000Z",
        },
      },
      standaloneAttempts: {
        "item-assess": {
          latest: {
            id: "attempt-2",
            status: "IN_PROGRESS",
            attemptNumber: 2,
            score: null,
            maxScore: null,
            startedAt: "2026-09-20T00:00:00.000Z",
            submittedAt: null,
            gradedAt: null,
          },
          count: 2,
        },
      },
      passEvidence: {
        "assess-1": [
          { status: "GRADED", score: 8, maxScore: 10 },
          { status: "GRADED", score: 3, maxScore: 10 },
        ],
      },
      requirementEvidence: {
        "assess-req": [{ status: "GRADED", score: null, maxScore: null }],
        "assess-unattempted": [],
      },
      practicedVocabularySetIds: ["set-practiced"],
      eligibleCohortsByCourse: {
        "course-1": [{ id: "cohort-1", name: "Cohort 1" }],
      },
    });
    // Every query is scoped by the user and the courses.
    const progressArgs = (
      progress.mock.calls[0] as unknown as [{ where: unknown }]
    )[0];
    expect(progressArgs.where).toEqual({
      userId: "user",
      courseItem: { module: { courseId: { in: ["course-1"] } } },
    });
    for (const call of attempts.mock.calls as unknown as Array<
      [{ where: { userId: string } }]
    >) {
      expect(call[0].where.userId).toBe("user");
    }
  });
});
