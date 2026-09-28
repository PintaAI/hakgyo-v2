import { TRPCError } from "@trpc/server";

import type { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { pageArgs, pageResult } from "~/server/api/pagination";
import {
  authorizeReview,
  requireReviewAccess,
  reviewAccessSelect,
} from "~/server/assessment/access";
import type {
  AttemptsNeedingReviewInput,
  ReviewAttemptInput,
} from "~/server/assessment/inputs";
import { buildAssessmentAnswerReviewUpdate } from "~/server/assessment/answer-content";
import {
  isPassingScore,
  markCourseItemCompleted,
} from "~/server/assessment/attempt";
import {
  attemptSummarySelect,
  reviewScope,
  summarizeAttempt,
} from "~/server/assessment/register";
import {
  requireCohortPermission,
  requireOrganizationPermission,
} from "~/server/authorization";
import { withTransactionRetry } from "~/server/db-retry";

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

/** Courses and cohorts that have attempts the reviewer can see, for the register filters. */
export async function getRegisterFilters(
  db: DatabaseClient,
  organizationId: string,
  userId: string,
) {
  const member = await requireOrganizationPermission({
    organizationId,
    userId,
    permission: "assessment.review",
  });
  const scope = reviewScope(member);
  const [courses, cohorts] = await Promise.all([
    db.course.findMany({
      where: {
        organizationId,
        modules: {
          some: { items: { some: { attempts: { some: scope } } } },
        },
      },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    db.cohort.findMany({
      where: { organizationId, assessmentAttempts: { some: scope } },
      select: { id: true, name: true, courseId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { courses, cohorts };
}

/** Full attempt (answers with correct options) for a reviewer. */
export async function getReviewAttempt(
  db: DatabaseClient,
  attemptId: string,
  userId: string,
) {
  // Load the review payload and the access fields in one query, then authorize before
  // returning anything.
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      ...reviewAccessSelect,
      ...attemptSummarySelect,
      organizationId: true,
      cohortId: true,
      assessmentEvent: {
        select: {
          ...attemptSummarySelect.assessmentEvent.select,
          participants: {
            where: { invalidatedAt: { not: null } },
            select: { userId: true },
          },
        },
      },
      answers: {
        orderBy: { question: { position: "asc" } },
        select: {
          id: true,
          questionId: true,
          content: true,
          autoScore: true,
          manualScore: true,
          feedback: true,
          reviewedAt: true,
          reviewedBy: { select: { user: { select: { name: true } } } },
          selectedOptions: { select: { optionId: true } },
          // The prompt is already delivered through `questions`.
          question: { select: { id: true, points: true, type: true } },
        },
      },
      assessment: {
        select: {
          id: true,
          title: true,
          passingScore: true,
          questions: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              prompt: true,
              explanation: true,
              type: true,
              points: true,
              options: {
                orderBy: { position: "asc" },
                select: { id: true, content: true, isCorrect: true },
              },
            },
          },
        },
      },
    },
  });
  if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
  const {
    answers,
    assessment: { questions, ...assessment },
    assessmentEvent,
    organizationId,
    cohortId,
    ...summary
  } = attempt;
  await authorizeReview(db, { ...summary, organizationId, cohortId }, userId);
  const invalidated = Boolean(
    assessmentEvent?.participants.some(
      (participant) => participant.userId === attempt.userId,
    ),
  );
  const event = assessmentEvent
    ? (({ participants: _participants, ...rest }) => rest)(assessmentEvent)
    : null;
  const writtenAnswers = answers.filter(
    (answer) => answer.question.type === "WRITTEN",
  ).length;
  return {
    ...summarizeAttempt(
      {
        ...summary,
        assessment,
        assessmentEvent: event,
        _count: { answers: writtenAnswers },
      },
      invalidated,
    ),
    answers,
    questions,
  };
}

/**
 * Scores every written answer of an IN_REVIEW attempt and finalizes it as GRADED; a passing
 * standalone attempt completes its course item.
 */
export async function reviewAttempt(
  db: PrismaClient,
  input: ReviewAttemptInput,
  userId: string,
) {
  const access = await requireReviewAccess(db, input.attemptId, userId);
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      // Serializes concurrent reviews of the same attempt.
      await tx.$queryRaw`
        SELECT "id" FROM "AssessmentAttempt" WHERE "id" = ${input.attemptId} FOR UPDATE
      `;
      const attempt = await tx.assessmentAttempt.findUnique({
        where: { id: input.attemptId },
        select: {
          id: true,
          userId: true,
          status: true,
          maxScore: true,
          courseItemId: true,
          assessment: { select: { passingScore: true } },
          assessmentEvent: {
            select: {
              status: true,
              participants: {
                where: { userId: access.attempt.userId },
                select: { invalidatedAt: true },
              },
            },
          },
          answers: {
            select: {
              id: true,
              autoScore: true,
              manualScore: true,
              question: { select: { points: true, type: true } },
            },
          },
        },
      });
      if (attempt?.status !== "IN_REVIEW") {
        throw new TRPCError({ code: "CONFLICT" });
      }
      if (
        attempt.assessmentEvent?.status === "CANCELLED" ||
        attempt.assessmentEvent?.participants[0]?.invalidatedAt
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This participation is no longer valid for review",
        });
      }
      const byId = new Map(
        attempt.answers.map((answer) => [answer.id, answer]),
      );
      // Later entries win for duplicate answer ids, as with sequential updates.
      const reviews = new Map<string, ReviewAttemptInput["answers"][number]>();
      for (const review of input.answers) {
        const answer = byId.get(review.answerId);
        if (
          answer?.question.type !== "WRITTEN" ||
          review.score > answer.question.points
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid review score",
          });
        }
        answer.manualScore = review.score;
        reviews.delete(review.answerId);
        reviews.set(review.answerId, review);
      }
      if (
        attempt.answers.some(
          (answer) =>
            answer.question.type === "WRITTEN" && answer.manualScore === null,
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Every written answer must be reviewed",
        });
      }
      await tx.$executeRaw(
        buildAssessmentAnswerReviewUpdate({
          attemptId: attempt.id,
          reviewedByMembershipId: access.membership.id,
          reviewedAt: new Date(),
          reviews: [...reviews.values()],
        }),
      );
      const score = attempt.answers.reduce(
        (total, answer) =>
          total + (answer.manualScore ?? answer.autoScore ?? 0),
        0,
      );
      const now = new Date();
      const finalized = await tx.assessmentAttempt.updateMany({
        where: { id: attempt.id, status: "IN_REVIEW" },
        data: { status: "GRADED", score, gradedAt: now },
      });
      if (finalized.count !== 1) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Another teacher has already completed this review",
        });
      }
      const passed = isPassingScore(
        score,
        attempt.maxScore,
        attempt.assessment.passingScore,
      );
      if (passed && !attempt.assessmentEvent) {
        await markCourseItemCompleted(
          tx,
          attempt.courseItemId,
          attempt.userId,
          now,
        );
      }
      return {
        status: "GRADED" as const,
        score,
        maxScore: attempt.maxScore,
      };
    }),
  );
}

/** Matches the learner's name or email, or the assessment title. */
function reviewSearchFilter(
  search: string,
): Prisma.AssessmentAttemptWhereInput {
  const contains = { contains: search, mode: "insensitive" as const };
  return {
    OR: [
      { user: { is: { OR: [{ name: contains }, { email: contains }] } } },
      { assessment: { is: { title: contains } } },
    ],
  };
}

/**
 * Teachers only review their own work: in simple mode, cohort-less attempts plus cohorts they
 * staff; in advanced mode, courses they own plus cohorts they instruct.
 */
function teacherReviewFilter(member: {
  id: string;
  organization: { permissionMode: string };
}): Prisma.AssessmentAttemptWhereInput {
  const simplified = member.organization.permissionMode === "SIMPLE";
  return {
    OR: [
      simplified
        ? { cohortId: null }
        : {
            courseItem: {
              module: { course: { ownerMembershipId: member.id } },
            },
          },
      {
        cohort: {
          is: {
            staff: {
              some: {
                organizationMemberId: member.id,
                ...(simplified ? {} : { role: "INSTRUCTOR" as const }),
              },
            },
          },
        },
      },
    ],
  };
}

/** Review queue: IN_REVIEW attempts with their written answers, oldest submission first. */
export async function listAttemptsNeedingReview(
  db: DatabaseClient,
  input: AttemptsNeedingReviewInput,
  userId: string,
) {
  const member = await requireOrganizationPermission({
    organizationId: input.organizationId,
    permission: "assessment.review",
    userId,
  });
  if (input.cohortId) {
    const cohort = await db.cohort.findFirst({
      where: { id: input.cohortId, organizationId: input.organizationId },
      select: { id: true },
    });
    if (!cohort) throw new TRPCError({ code: "NOT_FOUND" });
    await requireCohortPermission({
      cohortId: input.cohortId,
      permission: "assessment.review",
      userId,
    });
  }
  const where: Prisma.AssessmentAttemptWhereInput = {
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    cohortId: input.cohortId,
    status: "IN_REVIEW" as const,
    AND: [
      ...(input.search ? [reviewSearchFilter(input.search)] : []),
      ...(member.role === "TEACHER" ? [teacherReviewFilter(member)] : []),
    ],
  };
  const [items, total] = await Promise.all([
    db.assessmentAttempt.findMany({
      where,
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
      ...pageArgs(input),
      select: {
        id: true,
        assessmentId: true,
        courseItemId: true,
        attemptNumber: true,
        submittedAt: true,
        assessment: { select: { title: true } },
        cohort: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        answers: {
          where: { question: { type: "WRITTEN" } },
          select: {
            id: true,
            content: true,
            manualScore: true,
            feedback: true,
            question: { select: { id: true, prompt: true, points: true } },
          },
        },
      },
    }),
    input.includeTotal
      ? db.assessmentAttempt.count({ where })
      : Promise.resolve(undefined),
  ]);
  return pageResult(items, input.limit, total);
}
