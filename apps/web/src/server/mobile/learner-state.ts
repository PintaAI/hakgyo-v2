import type {
  LearnerContentProgress,
  LearnerEligibleCohort,
  LearnerPassEvidence,
  LearnerStandaloneAttempt,
  LearnerState,
} from "@hakgyo/shared/mobile-sync";

import type { Prisma } from "../../../generated/prisma/client";
import { eligibleCohortEnrollmentWhere } from "~/server/assessment/learner-view";
import { getVocabularyEvidenceForSets } from "~/server/vocabulary/evidence";

export type LearnerStateDb = Pick<
  Prisma.TransactionClient,
  | "contentProgress"
  | "assessmentAttempt"
  | "materialRequirement"
  | "vocabularyEntry"
  | "material"
  | "cohortEnrollment"
>;

/**
 * The per-user inputs the client needs to compose a course's learner view
 * (module access, completion, attempts, requirements) from its shared bundle.
 * Every query is driven by `userId`, and by the requirement rows of the
 * covered courses for the vocabulary evidence, never by whole tables.
 *
 * Dates are ISO strings: the state travels as plain JSON in the commit patch
 * and in the index alike.
 */
export async function buildLearnerState(
  db: LearnerStateDb,
  userId: string,
  courseIds: readonly string[],
  now = new Date(),
): Promise<LearnerState> {
  const ids = [...new Set(courseIds)].sort();
  if (!ids.length) {
    return {
      courseIds: [],
      contentProgress: {},
      standaloneAttempts: {},
      passEvidence: {},
      requirementEvidence: {},
      practicedVocabularySetIds: [],
      eligibleCohortsByCourse: {},
    };
  }
  const inCourses = { module: { courseId: { in: ids } } };

  const [progress, standaloneAttempts, passAttempts, requirements, cohorts] =
    await Promise.all([
      db.contentProgress.findMany({
        where: { userId, courseItem: inCourses },
        select: {
          courseItemId: true,
          status: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      db.assessmentAttempt.findMany({
        where: { userId, assessmentEventId: null, courseItem: inCourses },
        orderBy: [{ attemptNumber: "desc" }, { startedAt: "desc" }],
        select: {
          courseItemId: true,
          id: true,
          attemptNumber: true,
          status: true,
          score: true,
          maxScore: true,
          startedAt: true,
          submittedAt: true,
          gradedAt: true,
        },
      }),
      // Same rows as `loadPassEvidence` in course-outline: only graded
      // attempts with a usable score can pass an assessment.
      db.assessmentAttempt.findMany({
        where: {
          userId,
          assessmentEventId: null,
          status: "GRADED",
          score: { not: null },
          maxScore: { gt: 0 },
          assessment: { courseItems: { some: inCourses } },
        },
        select: {
          assessmentId: true,
          status: true,
          score: true,
          maxScore: true,
        },
      }),
      db.materialRequirement.findMany({
        where: {
          material: {
            courseItems: { some: { isPublished: true, ...inCourses } },
          },
        },
        select: { type: true, vocabularySetId: true, assessmentId: true },
      }),
      db.cohortEnrollment.findMany({
        where: eligibleCohortEnrollmentWhere(
          userId,
          { courseId: { in: ids } },
          now,
        ),
        orderBy: { enrolledAt: "desc" },
        select: {
          cohort: { select: { id: true, name: true, courseId: true } },
        },
      }),
    ]);

  const requirementAssessmentIds = [
    ...new Set(
      requirements.flatMap((requirement) =>
        requirement.type === "ASSESSMENT" && requirement.assessmentId
          ? [requirement.assessmentId]
          : [],
      ),
    ),
  ].sort();
  const [vocabularyEvidence, requirementAttempts] = await Promise.all([
    getVocabularyEvidenceForSets(
      db,
      userId,
      requirements.flatMap((requirement) =>
        requirement.type === "VOCABULARY_SET" && requirement.vocabularySetId
          ? [requirement.vocabularySetId]
          : [],
      ),
    ),
    // Same rows as the requirement check of `getCourseItemDetails`: every
    // graded attempt of the user, event attempts included.
    requirementAssessmentIds.length
      ? db.assessmentAttempt.findMany({
          where: {
            userId,
            status: "GRADED",
            assessmentId: { in: requirementAssessmentIds },
          },
          select: {
            assessmentId: true,
            status: true,
            score: true,
            maxScore: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const contentProgress: Record<string, LearnerContentProgress> = {};
  for (const entry of progress) {
    contentProgress[entry.courseItemId] = {
      status: entry.status,
      startedAt: entry.startedAt.toISOString(),
      completedAt: entry.completedAt?.toISOString() ?? null,
    };
  }

  const attemptsByItem: LearnerState["standaloneAttempts"] = {};
  for (const { courseItemId, ...attempt } of standaloneAttempts) {
    const serialized: LearnerStandaloneAttempt = {
      id: attempt.id,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      score: attempt.score,
      maxScore: attempt.maxScore,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      gradedAt: attempt.gradedAt?.toISOString() ?? null,
    };
    const existing = attemptsByItem[courseItemId];
    if (existing) {
      existing.count += 1;
    } else {
      // Rows arrive newest first, so the first one per item is the latest.
      attemptsByItem[courseItemId] = { latest: serialized, count: 1 };
    }
  }

  const passEvidence: Record<string, LearnerPassEvidence[]> = {};
  for (const { assessmentId, ...attempt } of passAttempts) {
    (passEvidence[assessmentId] ??= []).push({
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.maxScore,
    });
  }

  const requirementEvidence: Record<string, LearnerPassEvidence[]> = {};
  for (const assessmentId of requirementAssessmentIds) {
    requirementEvidence[assessmentId] = [];
  }
  for (const { assessmentId, ...attempt } of requirementAttempts) {
    requirementEvidence[assessmentId]?.push({
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.maxScore,
    });
  }

  const eligibleCohortsByCourse: Record<string, LearnerEligibleCohort[]> = {};
  for (const {
    cohort: { courseId, ...cohort },
  } of cohorts) {
    (eligibleCohortsByCourse[courseId] ??= []).push(cohort);
  }

  return {
    courseIds: ids,
    contentProgress,
    standaloneAttempts: attemptsByItem,
    passEvidence,
    requirementEvidence,
    practicedVocabularySetIds: [...vocabularyEvidence]
      .filter(([, evidence]) => evidence.practiced)
      .map(([setId]) => setId)
      .sort(),
    eligibleCohortsByCourse,
  };
}
