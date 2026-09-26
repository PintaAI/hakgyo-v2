import type { Prisma } from "../../../generated/prisma/client";
import { activeEnrollmentStatuses } from "~/server/authorization";
import { orderAssessmentQuestions } from "~/server/assessment-order";
import { shouldRevealAssessmentAnswers } from "~/server/assessment-result-policy";
import { getAssessmentDeadline } from "~/server/assessment-timing";
import { accessGrantingCohortStatuses } from "~/server/enrollment/cohort-access";

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
      description: true,
      instructions: true,
      passingScore: true,
      maxAttempts: true,
      timeLimitMinutes: true,
      shuffleQuestions: true,
      shuffleOptions: true,
      status: true,
      questions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          type: true,
          prompt: true,
          explanation: true,
          points: true,
          position: true,
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
    assessmentEvent: {
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        durationMinutes: true,
        closesAt: true,
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
      status: { in: [...accessGrantingCohortStatuses] },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
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
  const answersRevealed = shouldRevealAssessmentAnswers({
    attemptStatus: attempt?.status ?? "IN_PROGRESS",
    event: attempt?.assessmentEvent
      ? {
          type: attempt.assessmentEvent.type,
          status: attempt.assessmentEvent.status,
        }
      : null,
  });
  const questions = orderAssessmentQuestions(
    item.assessment.questions,
    attempt?.shuffleSeed ?? attempt?.id ?? input.attemptId,
    attempt?.assessmentEvent?.shuffleQuestions ??
      item.assessment.shuffleQuestions,
    item.assessment.shuffleOptions,
  ).map(({ explanation, options, ...question }) => ({
    ...question,
    explanation: answersRevealed ? explanation : null,
    options: options.map(({ isCorrect, ...option }) => ({
      ...option,
      ...(answersRevealed ? { isCorrect } : {}),
    })),
  }));
  return {
    ...item.assessment,
    context: {
      label:
        attempt?.assessmentEvent?.type === "TRYOUT"
          ? "Tryout"
          : attempt?.assessmentEvent
            ? "Asesmen on-demand"
            : "Asesmen bab",
      title: attempt?.assessmentEvent?.title ?? item.assessment.title,
      courseTitle: item.module.course.title,
      moduleTitle: item.module.title,
    },
    timeLimitMinutes:
      attempt?.assessmentEvent?.durationMinutes ??
      item.assessment.timeLimitMinutes,
    attemptDeadline: attempt?.assessmentEvent
      ? getAssessmentDeadline(
          attempt.startedAt,
          attempt.assessmentEvent.durationMinutes,
          attempt.assessmentEvent.closesAt,
        )
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
    eligibleCohorts: input.eligibleCohorts,
    questions,
  };
}

export type LearnerAssessment = ReturnType<typeof shapeLearnerAssessment>;

/**
 * `getForCourseItem({ courseItemId })` (no attempt) for many items in four queries. The caller
 * must already have authorized every item for `userId`. Items whose assessment is not published
 * are omitted (the procedure throws NOT_FOUND for them).
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
    item.assessment?.status === "PUBLISHED"
      ? [{ ...item, assessment: item.assessment }]
      : [],
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
