import {
  readScoreBands,
  ruleSectionsFor,
  ruleStateFrom,
  timedSectionsSeconds,
} from "@hakgyo/shared";

import type { Prisma } from "../../../generated/prisma/client";
import { activeEnrollmentStatuses } from "~/server/authorization";
import {
  orderAssessmentQuestions,
  shufflesQuestions,
} from "~/server/assessment/order";
import { shouldRevealAssessmentAnswers } from "~/server/assessment/result-policy";
import { attemptDeadline } from "~/server/assessment/timing";
import { liveClassCohortWhere } from "~/server/enrollment/cohort-access";

/** Section fields learners need to take a sectioned attempt (step 5 of the EPS-TOPIK plan). */
export const learnerSectionSelect = {
  id: true,
  position: true,
  title: true,
  instructions: true,
  timeLimitSeconds: true,
  navigation: true,
  lockAnswers: true,
  allowEarlyFinish: true,
  shuffleQuestions: true,
  audioMaxPlays: true,
  audioAutoplay: true,
  audioRepeatGapSeconds: true,
  pacedAnswerSeconds: true,
  pacedQuestionSeconds: true,
} satisfies Prisma.AssessmentSectionSelect;

/**
 * Learner view of a course item's assessment, as returned by `assessment.getForCourseItem`.
 * The select and shaping live here so batched loaders (the mobile dashboard) return exactly the
 * same shape as the single-item procedure, which is built on these helpers too.
 */
type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

export const learnerAssessmentItemSelect = {
  id: true,
  module: {
    select: {
      courseId: true,
      title: true,
      course: { select: { id: true, title: true } },
    },
  },
  assessment: {
    select: {
      id: true,
      title: true,
      contentLocked: true,
      description: true,
      instructions: true,
      passingScore: true,
      scoreBands: true,
      maxAttempts: true,
      timeLimitMinutes: true,
      shuffleQuestions: true,
      shuffleOptions: true,
      sections: {
        orderBy: { position: "asc" },
        select: learnerSectionSelect,
      },
      questionGroups: {
        select: { id: true, instructions: true, stimulus: true },
      },
      questions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          type: true,
          prompt: true,
          explanation: true,
          points: true,
          position: true,
          tags: true,
          sectionId: true,
          groupId: true,
          options: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              content: true,
              position: true,
              isCorrect: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CourseItemSelect;

export function learnerAssessmentAttemptSelect(userId: string) {
  return {
    id: true,
    shuffleSeed: true,
    startedAt: true,
    status: true,
    lastLogSeq: true,
    // Section starts and ends, so a resumed attempt (another tab or device) knows the timeline,
    // and, while an attempt with forward-only or audio rules runs, shown questions and plays.
    log: {
      where: {
        OR: [
          { kind: { in: ["SECTION_STARTED", "SECTION_ENDED", "SUBMITTED"] } },
          {
            kind: { in: ["QUESTION_SHOWN", "AUDIO_PLAYED"] },
            attempt: {
              status: "IN_PROGRESS",
              assessment: {
                sections: {
                  some: {
                    OR: [
                      { navigation: { not: "FREE" } },
                      { audioMaxPlays: { not: null } },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
      orderBy: { seq: "asc" },
      select: { kind: true, sectionId: true, questionId: true, at: true },
    },
    sections: {
      select: { sectionId: true, score: true, maxScore: true },
    },
    assessmentEvent: {
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        durationMinutes: true,
        closesAt: true,
        closedAt: true,
        shuffleQuestions: true,
        participants: {
          where: { userId },
          select: { invalidatedAt: true },
        },
      },
    },
  } satisfies Prisma.AssessmentAttemptSelect;
}

export const latestStandaloneAttemptSelect = {
  id: true,
  attemptNumber: true,
  status: true,
  score: true,
  maxScore: true,
  startedAt: true,
} satisfies Prisma.AssessmentAttemptSelect;

type LearnerAssessmentItem = Prisma.CourseItemGetPayload<{
  select: typeof learnerAssessmentItemSelect;
}>;
type LearnerAssessmentAttempt = Prisma.AssessmentAttemptGetPayload<{
  select: ReturnType<typeof learnerAssessmentAttemptSelect>;
}>;
type LatestStandaloneAttempt = Prisma.AssessmentAttemptGetPayload<{
  select: typeof latestStandaloneAttemptSelect;
}>;

/**
 * Where clause of the cohorts a learner can attribute a new attempt to. Scope by `courseId`, or by
 * `courseItemId` (the course containing that item) when the course id is not known yet.
 */
export function eligibleCohortEnrollmentWhere(
  userId: string,
  scope: { courseId: string | { in: string[] } } | { courseItemId: string },
  now: Date,
) {
  return {
    userId,
    status: { in: [...activeEnrollmentStatuses] },
    cohort: {
      ...("courseItemId" in scope
        ? {
            course: {
              modules: {
                some: { items: { some: { id: scope.courseItemId } } },
              },
            },
          }
        : { courseId: scope.courseId }),
      ...liveClassCohortWhere(now),
    },
  } satisfies Prisma.CohortEnrollmentWhereInput;
}

export function shapeLearnerAssessment(input: {
  item: LearnerAssessmentItem & {
    assessment: NonNullable<LearnerAssessmentItem["assessment"]>;
  };
  attemptId?: string;
  attempt: LearnerAssessmentAttempt | null;
  latestStandaloneAttempt: LatestStandaloneAttempt | null;
  standaloneAttemptCount: number;
  eligibleCohorts: Array<{ id: string; name: string }>;
}) {
  const { item, attempt } = input;
  // Groups without questions are left out below; `contentLocked` only decides whether answers
  // are revealed and is not sent to learners.
  const { questionGroups, contentLocked, ...assessment } = item.assessment;
  const answersRevealed = shouldRevealAssessmentAnswers({
    attemptStatus: attempt?.status ?? "IN_PROGRESS",
    event: attempt?.assessmentEvent
      ? {
          type: attempt.assessmentEvent.type,
          status: attempt.assessmentEvent.status,
        }
      : null,
    contentLocked,
  });
  const questions = orderAssessmentQuestions(
    item.assessment.questions,
    attempt?.shuffleSeed ?? attempt?.id ?? input.attemptId,
    shufflesQuestions(
      item.assessment.shuffleQuestions,
      attempt?.assessmentEvent?.shuffleQuestions,
    ),
    item.assessment.shuffleOptions,
    {
      sections: item.assessment.sections,
      eventShuffleQuestions: attempt?.assessmentEvent?.shuffleQuestions,
    },
  ).map(({ explanation, options, ...question }) => ({
    ...question,
    explanation: answersRevealed ? explanation : null,
    options: options.map(({ isCorrect, ...option }) => ({
      ...option,
      ...(answersRevealed ? { isCorrect } : {}),
    })),
  }));
  // Sections without questions are left out, so learners never see an empty part.
  const sections = item.assessment.sections.filter((section) =>
    item.assessment.questions.some(
      (question) => question.sectionId === section.id,
    ),
  );
  const timedSeconds = timedSectionsSeconds(sections) ?? 0;
  const log = attempt?.log ?? [];
  // Groups without questions are left out like empty sections.
  const groups = questionGroups.filter((group) =>
    questions.some((question) => question.groupId === group.id),
  );
  const rules = ruleStateFrom(ruleSectionsFor(sections, questions), log);
  const scoresVisible =
    attempt?.status === "GRADED" &&
    !attempt.assessmentEvent?.participants[0]?.invalidatedAt &&
    attempt.assessmentEvent?.status !== "CANCELLED";
  return {
    ...assessment,
    scoreBands: readScoreBands(item.assessment.scoreBands),
    sections,
    groups,
    /** Section starts, ends and the submission of this attempt, for the section timeline. */
    sectionEntries: log.flatMap(({ kind, sectionId, at }) =>
      kind === "SECTION_STARTED" ||
      kind === "SECTION_ENDED" ||
      kind === "SUBMITTED"
        ? [{ kind, sectionId, at }]
        : [],
    ),
    /**
     * What the section rules have counted so far: audio plays per question and, per section, the
     * furthest question index shown (forward-only sections cannot go back before it).
     */
    questionProgress: {
      plays: Object.fromEntries(rules.plays),
      furthest: Object.fromEntries(rules.furthest),
    },
    /** Each section's score once the attempt's score is visible. */
    sectionResults: scoresVisible
      ? (attempt?.sections ?? []).flatMap(({ sectionId, score, maxScore }) =>
          score === null || maxScore === null
            ? []
            : [{ sectionId, score, maxScore }],
        )
      : [],
    context: {
      label:
        attempt?.assessmentEvent?.type === "TRYOUT"
          ? "Tryout"
          : attempt?.assessmentEvent
            ? "Latihan"
            : "Tugas bab",
      title: attempt?.assessmentEvent?.title ?? item.assessment.title,
      courseTitle: item.module.course.title,
      moduleTitle: item.module.title,
    },
    // Timed sections set the time: their total (intros come on top).
    timeLimitMinutes: timedSeconds
      ? Math.ceil(timedSeconds / 60)
      : (attempt?.assessmentEvent?.durationMinutes ??
        item.assessment.timeLimitMinutes),
    attemptDeadline: attempt
      ? attemptDeadline({
          startedAt: attempt.startedAt,
          timeLimitMinutes: item.assessment.timeLimitMinutes,
          event: attempt.assessmentEvent,
          sections,
        })
      : null,
    event: attempt?.assessmentEvent
      ? {
          id: attempt.assessmentEvent.id,
          title: attempt.assessmentEvent.title,
          type: attempt.assessmentEvent.type,
          status: attempt.assessmentEvent.status,
        }
      : null,
    latestStandaloneAttempt: input.latestStandaloneAttempt,
    standaloneAttemptCount: input.standaloneAttemptCount,
    answersRevealed,
    /** Last progress-log sequence the server processed; clients continue after it. */
    progressSeq: attempt?.lastLogSeq ?? 0,
    eligibleCohorts: input.eligibleCohorts,
    questions,
  };
}

export type LearnerAssessment = ReturnType<typeof shapeLearnerAssessment>;

/**
 * `getForCourseItem({ courseItemId })` (no attempt) for many items in four queries. The caller
 * must already have authorized every item for `userId`. Items without an assessment are omitted
 * (the procedure throws NOT_FOUND for them).
 */
export async function getLearnerAssessmentsForCourseItems(
  db: DatabaseClient,
  userId: string,
  courseItemIds: readonly string[],
): Promise<Map<string, LearnerAssessment>> {
  const ids = [...new Set(courseItemIds)];
  if (!ids.length) return new Map();
  const [items, standaloneAttempts] = await Promise.all([
    db.courseItem.findMany({
      where: { id: { in: ids } },
      select: learnerAssessmentItemSelect,
    }),
    db.assessmentAttempt.findMany({
      where: {
        courseItemId: { in: ids },
        userId,
        assessmentEventId: null,
      },
      orderBy: [{ attemptNumber: "desc" }, { startedAt: "desc" }],
      select: { courseItemId: true, ...latestStandaloneAttemptSelect },
    }),
  ]);
  const published = items.flatMap((item) =>
    item.assessment ? [{ ...item, assessment: item.assessment }] : [],
  );
  const courseIds = [...new Set(published.map((item) => item.module.courseId))];
  const eligibleEnrollments = courseIds.length
    ? await db.cohortEnrollment.findMany({
        where: eligibleCohortEnrollmentWhere(
          userId,
          { courseId: { in: courseIds } },
          new Date(),
        ),
        orderBy: { enrolledAt: "desc" },
        select: {
          cohort: { select: { id: true, name: true, courseId: true } },
        },
      })
    : [];

  const attemptsByItem = new Map<string, LatestStandaloneAttempt[]>();
  for (const { courseItemId, ...attempt } of standaloneAttempts) {
    const list = attemptsByItem.get(courseItemId);
    if (list) list.push(attempt);
    else attemptsByItem.set(courseItemId, [attempt]);
  }
  const cohortsByCourse = new Map<
    string,
    Array<{ id: string; name: string }>
  >();
  for (const {
    cohort: { courseId, ...cohort },
  } of eligibleEnrollments) {
    const list = cohortsByCourse.get(courseId);
    if (list) list.push(cohort);
    else cohortsByCourse.set(courseId, [cohort]);
  }

  return new Map(
    published.map((item) => {
      const attempts = attemptsByItem.get(item.id) ?? [];
      return [
        item.id,
        shapeLearnerAssessment({
          item,
          attempt: null,
          latestStandaloneAttempt: attempts[0] ?? null,
          standaloneAttemptCount: attempts.length,
          eligibleCohorts: cohortsByCourse.get(item.module.courseId) ?? [],
        }),
      ];
    }),
  );
}
