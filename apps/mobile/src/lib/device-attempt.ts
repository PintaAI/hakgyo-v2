import {
  orderAssessmentQuestions,
  shufflesQuestions,
  startsOnDevice,
} from "@hakgyo/shared";
import type { LearnerStandaloneAttempt } from "@hakgyo/shared/mobile-sync";

import type { CourseItemAssessment, LearnerAttempt } from "../sync/hooks";

/**
 * Whether "Mulai" can open this standalone tugas at once, without the server
 * (see `startsOnDevice`): also not for learners who must pick one of several
 * classes first.
 */
export function canStartOnDevice(assessment: CourseItemAssessment) {
  return (
    !assessment.event &&
    assessment.eligibleCohorts.length <= 1 &&
    startsOnDevice({
      timeLimitMinutes: assessment.timeLimitMinutes,
      maxAttempts: assessment.maxAttempts,
      sectionCount: assessment.sections.length,
    })
  );
}

/**
 * An attempt started on the device: the attempt and the assessment exactly
 * as the server's start would return them (`getMyAttempt`,
 * `getForCourseItem`), with the questions in the order the server derives
 * from the same seed, and the summary the learner state records for it.
 */
export function startAttemptOnDevice(
  assessment: CourseItemAssessment,
  input: {
    attemptId: string;
    shuffleSeed: string;
    courseId: string;
    courseItemId: string;
    startedAt: Date;
  },
): {
  attempt: LearnerAttempt;
  assessmentDetail: CourseItemAssessment;
  standalone: { latest: LearnerStandaloneAttempt; count: number };
} {
  const cohort = assessment.eligibleCohorts[0] ?? null;
  const attemptNumber =
    Math.max(
      assessment.standaloneAttemptCount,
      assessment.latestStandaloneAttempt?.attemptNumber ?? 0,
    ) + 1;
  const course = { id: input.courseId, title: assessment.context.courseTitle };
  const attempt: LearnerAttempt = {
    id: input.attemptId,
    courseItemId: input.courseItemId,
    attemptNumber,
    status: "IN_PROGRESS",
    score: null,
    maxScore: null,
    startedAt: input.startedAt,
    submittedAt: null,
    gradedAt: null,
    assessment: { title: assessment.title },
    courseItem: {
      module: { title: assessment.context.moduleTitle, course },
    },
    assessmentEvent: null,
    cohort,
    answers: [],
    context: {
      kind: "CHAPTER",
      label: "Tugas bab",
      title: assessment.title,
      course,
      moduleTitle: assessment.context.moduleTitle,
      cohort,
      scope: "CHAPTER",
      eventId: null,
    },
  };
  const summary = {
    id: input.attemptId,
    attemptNumber,
    status: "IN_PROGRESS" as const,
    score: null,
    maxScore: null,
    startedAt: input.startedAt,
  };
  const assessmentDetail: CourseItemAssessment = {
    ...assessment,
    questions: orderAssessmentQuestions(
      assessment.questions,
      input.shuffleSeed,
      shufflesQuestions(assessment.shuffleQuestions),
      assessment.shuffleOptions,
      { sections: assessment.sections },
    ),
    attemptDeadline: null,
    latestStandaloneAttempt: summary,
    standaloneAttemptCount: assessment.standaloneAttemptCount + 1,
  };
  return {
    attempt,
    assessmentDetail,
    standalone: {
      latest: {
        id: input.attemptId,
        status: "IN_PROGRESS",
        attemptNumber,
        score: null,
        maxScore: null,
        startedAt: input.startedAt.toISOString(),
        submittedAt: null,
        gradedAt: null,
      },
      count: assessment.standaloneAttemptCount + 1,
    },
  };
}
