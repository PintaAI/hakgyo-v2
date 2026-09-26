import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma } from "../../../../generated/prisma/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { pageInput, pageResult } from "~/server/api/pagination";
import {
  gradableAttemptSelect,
  gradeInProgressAttempt,
  lockAttemptStart,
  lockInProgressAttempt,
} from "~/server/assessment-attempt";
import { isAssessmentExpired } from "~/server/assessment-timing";
import {
  buildAssessmentAnswerContentUpdate,
  buildAssessmentAnswerReviewUpdate,
} from "~/server/assessment-answer-content";
import {
  assessmentContext,
  attemptSummarySelect,
  listRegisteredAttempts,
  registerInput,
  reviewScope,
  summarizeAttempt,
} from "~/server/assessment-register";
import {
  eligibleCohortEnrollmentWhere,
  latestStandaloneAttemptSelect,
  learnerAssessmentAttemptSelect,
  learnerAssessmentItemSelect,
  shapeLearnerAssessment,
} from "~/server/assessment/learner-view";
import { deleteAssessmentWithProgress } from "~/server/content-resource-deletion";
import {
  isUniqueConstraintError,
  withTransactionRetry,
} from "~/server/db-retry";
import {
  MAX_ASSESSMENT_OPTIONS,
  MIN_ASSESSMENT_OPTIONS,
} from "~/lib/assessment-options";
import {
  activeEnrollmentStatuses,
  requireCohortPermission,
  requireContentAuthor,
  requireCourseItemAccess,
  requireCoursePermission,
  requireOrganizationPermission,
} from "~/server/authorization";
import { accessGrantingCohortStatuses } from "~/server/enrollment/cohort-access";
import { toPrismaJsonValue } from "~/server/prisma-json";

const id = z.string().min(1);
const json = z.unknown().transform(toPrismaJsonValue);
const answerInput = z.object({
  questionId: id,
  content: json.optional(),
  optionIds: z.array(id).max(100).default([]),
});
const assessmentFields = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  editorSchemaVersion: z.number().int().positive().optional(),
  instructions: json.optional(),
  passingScore: z.number().int().min(0).max(100).nullable().optional(),
  maxAttempts: z.number().int().positive().nullable().optional(),
  timeLimitMinutes: z.number().int().positive().nullable().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
});
const questionFields = z.object({
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "WRITTEN"]),
  prompt: json,
  explanation: json.optional(),
  points: z.number().int().positive().max(10000).optional(),
});
const optionFields = z.object({
  content: json,
  isCorrect: z.boolean().optional(),
});

async function requireAssessmentManagement(
  db: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  assessmentId: string,
  userId: string,
  action: "edit" | "delete" = "edit",
) {
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, organizationId: true, createdByMembershipId: true },
  });
  if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });
  await requireContentAuthor({
    organizationId: assessment.organizationId,
    userId,
    createdByMembershipId: assessment.createdByMembershipId,
    action,
  });
  return assessment;
}

/**
 * Access check for writes to an attempt the user already owns and has in progress.
 *
 * The attempt could only be started after the full `requireCourseItemAccess` check (including
 * outline/module locks), so autosaves only need to confirm access has not been revoked since:
 * the item and course are still published and the learner still has a live course or cohort
 * enrollment. That is a single indexed lookup instead of rebuilding the course outline on every
 * autosave. Anyone who does not match (staff previews, managers, revoked learners) falls back to
 * the full check, so revocation still blocks saving.
 */
async function requireInProgressAttemptAccess(
  db: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  courseItemId: string,
  userId: string,
) {
  const now = new Date();
  const enrolled = await db.courseItem.findFirst({
    where: {
      id: courseItemId,
      isPublished: true,
      module: {
        course: {
          status: "PUBLISHED",
          OR: [
            {
              enrollments: {
                some: {
                  userId,
                  status: { in: [...activeEnrollmentStatuses] },
                  source: { not: "COHORT" },
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
              },
            },
            {
              cohorts: {
                some: {
                  status: { in: [...accessGrantingCohortStatuses] },
                  OR: [{ endsAt: null }, { endsAt: { gt: now } }],
                  enrollments: {
                    some: {
                      userId,
                      status: { in: [...activeEnrollmentStatuses] },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
    select: { id: true },
  });
  if (!enrolled) await requireCourseItemAccess({ courseItemId, userId });
}

const reviewAccessSelect = {
  id: true,
  organizationId: true,
  cohortId: true,
  userId: true,
  courseItem: { select: { module: { select: { courseId: true } } } },
} satisfies Prisma.AssessmentAttemptSelect;

async function authorizeReview(
  db: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  attempt: Prisma.AssessmentAttemptGetPayload<{
    select: typeof reviewAccessSelect;
  }>,
  userId: string,
) {
  const [, membership] = await Promise.all([
    attempt.cohortId
      ? requireCohortPermission({
          cohortId: attempt.cohortId,
          permission: "assessment.review",
          userId,
        })
      : requireCoursePermission({
          courseId: attempt.courseItem.module.courseId,
          permission: "course.manage",
          userId,
        }),
    db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: attempt.organizationId,
          userId,
        },
      },
      select: { id: true },
    }),
  ]);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
  return membership;
}

async function requireReviewAccess(
  db: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  attemptId: string,
  userId: string,
) {
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: reviewAccessSelect,
  });
  if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
  const membership = await authorizeReview(db, attempt, userId);
  return { attempt, membership };
}

export const assessmentRouter = createTRPCRouter({
  listAttempts: protectedProcedure
    .input(registerInput.extend({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      const member = await requireOrganizationPermission({
        organizationId: input.organizationId,
        userId: ctx.actorUserId,
        permission: "assessment.review",
      });
      return listRegisteredAttempts(ctx.db, reviewScope(member), input);
    }),
  getRegisterFilters: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      const member = await requireOrganizationPermission({
        ...input,
        userId: ctx.actorUserId,
        permission: "assessment.review",
      });
      const scope = reviewScope(member);
      const [courses, cohorts] = await Promise.all([
        ctx.db.course.findMany({
          where: {
            organizationId: input.organizationId,
            modules: {
              some: { items: { some: { attempts: { some: scope } } } },
            },
          },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
        }),
        ctx.db.cohort.findMany({
          where: {
            organizationId: input.organizationId,
            assessmentAttempts: { some: scope },
          },
          select: { id: true, name: true, courseId: true },
          orderBy: { name: "asc" },
        }),
      ]);
      return { courses, cohorts };
    }),
  getReviewAttempt: protectedProcedure
    .input(z.object({ attemptId: id }))
    .query(async ({ ctx, input }) => {
      // Load the review payload and the access fields in one query, then authorize before
      // returning anything.
      const attempt = await ctx.db.assessmentAttempt.findUnique({
        where: { id: input.attemptId },
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
      await authorizeReview(
        ctx.db,
        { ...summary, organizationId, cohortId },
        ctx.actorUserId,
      );
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
    }),
  listMyAttemptHistory: protectedProcedure
    .input(registerInput)
    .query(({ ctx, input }) =>
      listRegisteredAttempts(ctx.db, { userId: ctx.actorUserId }, input),
    ),
  list: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      const member = await requireContentAuthor({
        ...input,
        userId: ctx.actorUserId,
      });
      const assessments = await ctx.db.assessment.findMany({
        where: {
          organizationId: input.organizationId,
          ...(member.organization.permissionMode === "ADVANCED" &&
          member.role === "TEACHER"
            ? { createdByMembershipId: member.id }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
        // List views only need summary fields; `instructions` (rich JSON) is loaded by `get`.
        select: {
          id: true,
          organizationId: true,
          title: true,
          description: true,
          status: true,
          passingScore: true,
          maxAttempts: true,
          timeLimitMinutes: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      // Relation `_count` compiles to whole-table grouped subqueries; count only these rows.
      const assessmentIds = assessments.map((assessment) => assessment.id);
      const [questionGroups, courseItemGroups] = assessmentIds.length
        ? await Promise.all([
            ctx.db.assessmentQuestion.groupBy({
              by: ["assessmentId"],
              where: { assessmentId: { in: assessmentIds } },
              _count: { _all: true },
            }),
            ctx.db.courseItem.groupBy({
              by: ["assessmentId"],
              where: { assessmentId: { in: assessmentIds } },
              _count: { _all: true },
            }),
          ])
        : [[], []];
      const questionCounts = new Map(
        questionGroups.map((group) => [group.assessmentId, group._count._all]),
      );
      const courseItemCounts = new Map(
        courseItemGroups.map((group) => [
          group.assessmentId,
          group._count._all,
        ]),
      );
      return assessments.map((assessment) => ({
        ...assessment,
        _count: {
          questions: questionCounts.get(assessment.id) ?? 0,
          courseItems: courseItemCounts.get(assessment.id) ?? 0,
        },
      }));
    }),
  get: protectedProcedure
    .input(z.object({ assessmentId: id }))
    .query(async ({ ctx, input }) => {
      await requireAssessmentManagement(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
      );
      return ctx.db.assessment.findUniqueOrThrow({
        where: { id: input.assessmentId },
        include: {
          questions: {
            orderBy: { position: "asc" },
            include: { options: { orderBy: { position: "asc" } } },
          },
        },
      });
    }),
  create: protectedProcedure
    .input(assessmentFields.extend({ organizationId: id }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireContentAuthor({
        organizationId: input.organizationId,
        userId: ctx.actorUserId,
      });
      return ctx.db.assessment.create({
        data: {
          ...input,
          createdByMembershipId: member.id,
          publishedAt: input.status === "PUBLISHED" ? new Date() : undefined,
        },
      });
    }),
  update: protectedProcedure
    .input(assessmentFields.partial().extend({ assessmentId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireAssessmentManagement(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
      );
      const { assessmentId, ...data } = input;
      return ctx.db.assessment.update({
        where: { id: assessmentId },
        data: {
          ...data,
          ...(data.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
        },
      });
    }),
  delete: protectedProcedure
    .input(z.object({ assessmentId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireAssessmentManagement(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
        "delete",
      );
      const removed = await ctx.db.$transaction((tx) =>
        deleteAssessmentWithProgress(tx, input.assessmentId),
      );
      return { deleted: true, removed };
    }),
  createQuestion: protectedProcedure
    .input(questionFields.extend({ assessmentId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireAssessmentManagement(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
      );
      // Lock the assessment so concurrent creates cannot compute the same next position.
      return withTransactionRetry(() =>
        ctx.db.$transaction(async (tx) => {
          await tx.$queryRaw`
            SELECT "id" FROM "Assessment" WHERE "id" = ${input.assessmentId} FOR UPDATE
          `;
          const position = await tx.assessmentQuestion.aggregate({
            where: { assessmentId: input.assessmentId },
            _max: { position: true },
          });
          return tx.assessmentQuestion.create({
            data: { ...input, position: (position._max.position ?? -1) + 1 },
          });
        }),
      );
    }),
  updateQuestion: protectedProcedure
    .input(questionFields.partial().extend({ questionId: id }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.db.assessmentQuestion.findUnique({
        where: { id: input.questionId },
        select: { assessmentId: true },
      });
      if (!question) throw new TRPCError({ code: "NOT_FOUND" });
      await requireAssessmentManagement(
        ctx.db,
        question.assessmentId,
        ctx.actorUserId,
      );
      const { questionId, ...data } = input;
      return ctx.db.assessmentQuestion.update({
        where: { id: questionId },
        data,
      });
    }),
  deleteQuestion: protectedProcedure
    .input(z.object({ questionId: id }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.db.assessmentQuestion.findUnique({
        where: { id: input.questionId },
        select: { assessmentId: true },
      });
      if (!question) throw new TRPCError({ code: "NOT_FOUND" });
      await requireAssessmentManagement(
        ctx.db,
        question.assessmentId,
        ctx.actorUserId,
        "delete",
      );
      await ctx.db.assessmentQuestion.delete({
        where: { id: input.questionId },
      });
      return { deleted: true };
    }),
  createOption: protectedProcedure
    .input(optionFields.extend({ questionId: id }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.db.assessmentQuestion.findUnique({
        where: { id: input.questionId },
        select: { assessmentId: true, type: true },
      });
      if (!question) throw new TRPCError({ code: "NOT_FOUND" });
      if (question.type === "WRITTEN")
        throw new TRPCError({ code: "BAD_REQUEST" });
      await requireAssessmentManagement(
        ctx.db,
        question.assessmentId,
        ctx.actorUserId,
      );
      // Lock the question so the option cap and the next position are checked against
      // committed options only, one create at a time.
      return withTransactionRetry(() =>
        ctx.db.$transaction(async (tx) => {
          await tx.$queryRaw`
            SELECT "id" FROM "AssessmentQuestion" WHERE "id" = ${input.questionId} FOR UPDATE
          `;
          const position = await tx.assessmentOption.aggregate({
            where: { questionId: input.questionId },
            _count: { _all: true },
            _max: { position: true },
          });
          if (position._count._all >= MAX_ASSESSMENT_OPTIONS) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Sebuah soal pilihan maksimal memiliki empat opsi.",
            });
          }
          return tx.assessmentOption.create({
            data: { ...input, position: (position._max.position ?? -1) + 1 },
          });
        }),
      );
    }),
  updateOption: protectedProcedure
    .input(optionFields.partial().extend({ optionId: id }))
    .mutation(async ({ ctx, input }) => {
      const option = await ctx.db.assessmentOption.findUnique({
        where: { id: input.optionId },
        select: {
          questionId: true,
          question: { select: { assessmentId: true, type: true } },
        },
      });
      if (!option) throw new TRPCError({ code: "NOT_FOUND" });
      await requireAssessmentManagement(
        ctx.db,
        option.question.assessmentId,
        ctx.actorUserId,
      );
      const { optionId, ...data } = input;

      if (data.isCorrect && option.question.type === "SINGLE_CHOICE") {
        // The question row lock serializes concurrent "mark correct" calls for the same question,
        // so exactly one option ends up correct without serializable isolation.
        return withTransactionRetry(() =>
          ctx.db.$transaction(async (tx) => {
            await tx.$queryRaw`
              SELECT "id" FROM "AssessmentQuestion" WHERE "id" = ${option.questionId} FOR UPDATE
            `;
            await tx.assessmentOption.updateMany({
              where: {
                questionId: option.questionId,
                id: { not: optionId },
                isCorrect: true,
              },
              data: { isCorrect: false },
            });
            return tx.assessmentOption.update({
              where: { id: optionId },
              data,
            });
          }),
        );
      }

      return ctx.db.assessmentOption.update({ where: { id: optionId }, data });
    }),
  deleteOption: protectedProcedure
    .input(z.object({ optionId: id }))
    .mutation(async ({ ctx, input }) => {
      const option = await ctx.db.assessmentOption.findUnique({
        where: { id: input.optionId },
        select: {
          question: {
            select: {
              assessmentId: true,
              type: true,
              _count: { select: { options: true } },
            },
          },
        },
      });
      if (!option) throw new TRPCError({ code: "NOT_FOUND" });
      await requireAssessmentManagement(
        ctx.db,
        option.question.assessmentId,
        ctx.actorUserId,
        "delete",
      );
      if (
        option.question.type !== "WRITTEN" &&
        option.question._count.options <= MIN_ASSESSMENT_OPTIONS
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sebuah soal pilihan harus memiliki minimal dua opsi.",
        });
      }
      await ctx.db.assessmentOption.delete({ where: { id: input.optionId } });
      return { deleted: true };
    }),
  attachAsset: protectedProcedure
    .input(z.object({ assessmentId: id, assetId: id }))
    .mutation(async ({ ctx, input }) => {
      const assessment = await requireAssessmentManagement(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
      );
      const asset = await ctx.db.asset.findFirst({
        where: {
          id: input.assetId,
          organizationId: assessment.organizationId,
          confirmedAt: { not: null },
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!asset) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Asset must be confirmed and belong to the assessment organization",
        });
      }
      return ctx.db.assessmentAsset.upsert({
        where: {
          assessmentId_assetId: {
            assessmentId: input.assessmentId,
            assetId: input.assetId,
          },
        },
        create: {
          assessmentId: input.assessmentId,
          assetId: input.assetId,
          organizationId: assessment.organizationId,
        },
        update: {},
      });
    }),
  detachAsset: protectedProcedure
    .input(z.object({ assessmentId: id, assetId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireAssessmentManagement(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
      );
      await ctx.db.assessmentAsset.deleteMany({ where: input });
      return { detached: true };
    }),
  getForCourseItem: protectedProcedure
    .input(z.object({ courseItemId: id, attemptId: id.optional() }))
    .query(async ({ ctx, input }) => {
      // Every lookup below is independent, so they run concurrently. The attempt/access check
      // still gates the response: nothing is returned unless it resolves.
      const accessCheck = input.attemptId
        ? ctx.db.assessmentAttempt
            .findFirst({
              where: {
                id: input.attemptId,
                courseItemId: input.courseItemId,
                userId: ctx.actorUserId,
              },
              select: learnerAssessmentAttemptSelect(ctx.actorUserId),
            })
            .then(async (attempt) => {
              if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
              const eventParticipant = attempt.assessmentEvent?.participants[0];
              if (
                attempt.assessmentEvent &&
                (!eventParticipant || eventParticipant.invalidatedAt)
              ) {
                throw new TRPCError({ code: "FORBIDDEN" });
              }
              if (!attempt.assessmentEvent) {
                await requireCourseItemAccess({
                  courseItemId: input.courseItemId,
                  userId: ctx.actorUserId,
                });
              }
              return attempt;
            })
        : requireCourseItemAccess({
            courseItemId: input.courseItemId,
            userId: ctx.actorUserId,
          }).then(() => null);
      const [
        attempt,
        item,
        [latestStandaloneAttempt, standaloneAttemptCount],
        eligibleCohorts,
      ] = await Promise.all([
        accessCheck,
        ctx.db.courseItem.findUnique({
          where: { id: input.courseItemId },
          select: learnerAssessmentItemSelect,
        }),
        input.attemptId
          ? ([null, 0] as const)
          : Promise.all([
              ctx.db.assessmentAttempt.findFirst({
                where: {
                  courseItemId: input.courseItemId,
                  userId: ctx.actorUserId,
                  assessmentEventId: null,
                },
                orderBy: [{ attemptNumber: "desc" }, { startedAt: "desc" }],
                select: latestStandaloneAttemptSelect,
              }),
              ctx.db.assessmentAttempt.count({
                where: {
                  courseItemId: input.courseItemId,
                  userId: ctx.actorUserId,
                  assessmentEventId: null,
                },
              }),
            ]),
        ctx.db.cohortEnrollment.findMany({
          // Scoped by the item's course without waiting for the item.
          where: eligibleCohortEnrollmentWhere(
            ctx.actorUserId,
            { courseItemId: input.courseItemId },
            new Date(),
          ),
          orderBy: { enrolledAt: "desc" },
          select: { cohort: { select: { id: true, name: true } } },
        }),
      ]);
      if (item?.assessment?.status !== "PUBLISHED") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return shapeLearnerAssessment({
        item: { ...item, assessment: item.assessment },
        attemptId: input.attemptId,
        attempt,
        latestStandaloneAttempt,
        standaloneAttemptCount,
        eligibleCohorts: eligibleCohorts.map(({ cohort }) => cohort),
      });
    }),

  startAttempt: protectedProcedure
    .input(z.object({ courseItemId: id, cohortId: id.optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireCourseItemAccess({
        courseItemId: input.courseItemId,
        userId: ctx.actorUserId,
      });
      // READ COMMITTED + a per-learner/item advisory lock instead of serializable isolation. The
      // (courseItemId, userId, attemptNumber) unique constraint stays as a backstop: on P2002 the
      // whole transaction re-runs and returns the in-progress attempt created by the winner.
      return withTransactionRetry(
        () =>
          ctx.db.$transaction(async (tx) => {
            await lockAttemptStart(tx, ctx.actorUserId, input.courseItemId);
            const item = await tx.courseItem.findUnique({
              where: { id: input.courseItemId },
              select: {
                organizationId: true,
                module: { select: { courseId: true } },
                assessment: {
                  select: { id: true, status: true, maxAttempts: true },
                },
              },
            });
            if (item?.assessment?.status !== "PUBLISHED") {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Assessment is not published",
              });
            }
            const eligibleWhere = eligibleCohortEnrollmentWhere(
              ctx.actorUserId,
              { courseId: item.module.courseId },
              new Date(),
            );
            const cohortEnrollments = await tx.cohortEnrollment.findMany({
              where: {
                ...eligibleWhere,
                cohort: {
                  ...eligibleWhere.cohort,
                  ...(input.cohortId ? { id: input.cohortId } : {}),
                },
              },
              orderBy: { enrolledAt: "desc" },
              select: { cohortId: true },
              take: input.cohortId ? 1 : 2,
            });
            if (input.cohortId && cohortEnrollments.length === 0) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "You are not actively enrolled in this study group",
              });
            }
            if (!input.cohortId && cohortEnrollments.length > 1) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Select a study group before starting this assessment",
              });
            }
            const cohortId =
              input.cohortId ?? cohortEnrollments[0]?.cohortId ?? null;
            const current = await tx.assessmentAttempt.findFirst({
              where: {
                courseItemId: input.courseItemId,
                userId: ctx.actorUserId,
                status: "IN_PROGRESS",
                assessmentEventId: null,
              },
              orderBy: { attemptNumber: "desc" },
            });
            if (current) {
              if (
                current.cohortId &&
                cohortId &&
                current.cohortId !== cohortId
              ) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message: "This attempt belongs to another study group",
                });
              }
              if (!current.cohortId && cohortId) {
                return tx.assessmentAttempt.update({
                  where: { id: current.id },
                  data: { cohortId },
                });
              }
              return current;
            }
            // One grouped query yields both the standalone attempt count (for maxAttempts) and the
            // highest attempt number across standalone and event attempts of this item.
            const attemptGroups = await tx.assessmentAttempt.groupBy({
              by: ["assessmentEventId"],
              where: {
                courseItemId: input.courseItemId,
                userId: ctx.actorUserId,
              },
              _count: { _all: true },
              _max: { attemptNumber: true },
            });
            const count =
              attemptGroups.find((group) => group.assessmentEventId === null)
                ?._count._all ?? 0;
            const lastAttemptNumber = attemptGroups.reduce(
              (max, group) => Math.max(max, group._max.attemptNumber ?? 0),
              0,
            );
            if (
              item.assessment.maxAttempts !== null &&
              count >= item.assessment.maxAttempts
            ) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Maximum attempts reached",
              });
            }
            await tx.contentProgress.upsert({
              where: {
                courseItemId_userId: {
                  courseItemId: input.courseItemId,
                  userId: ctx.actorUserId,
                },
              },
              create: {
                courseItemId: input.courseItemId,
                userId: ctx.actorUserId,
              },
              update: {},
            });
            return tx.assessmentAttempt.create({
              data: {
                assessmentId: item.assessment.id,
                courseItemId: input.courseItemId,
                organizationId: item.organizationId,
                cohortId,
                userId: ctx.actorUserId,
                attemptNumber: lastAttemptNumber + 1,
                shuffleSeed: crypto.randomUUID(),
              },
            });
          }),
        { shouldRetry: isUniqueConstraintError },
      );
    }),

  saveAnswers: protectedProcedure
    .input(
      z.object({
        attemptId: id,
        answers: z.array(answerInput).min(1).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const attempt = await ctx.db.assessmentAttempt.findUnique({
        where: { id: input.attemptId },
        select: {
          userId: true,
          status: true,
          courseItemId: true,
          organizationId: true,
          assessmentEvent: {
            select: {
              status: true,
              participants: {
                where: { userId: ctx.actorUserId },
                select: { invalidatedAt: true },
              },
            },
          },
        },
      });
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.actorUserId)
        throw new TRPCError({ code: "FORBIDDEN" });
      if (attempt.assessmentEvent) {
        if (
          attempt.assessmentEvent.status !== "OPEN" ||
          !attempt.assessmentEvent.participants[0] ||
          attempt.assessmentEvent.participants[0].invalidatedAt
        ) {
          throw new TRPCError({ code: "PRECONDITION_FAILED" });
        }
      } else if (attempt.status === "IN_PROGRESS") {
        await requireInProgressAttemptAccess(
          ctx.db,
          attempt.courseItemId,
          ctx.actorUserId,
        );
      } else {
        await requireCourseItemAccess({
          courseItemId: attempt.courseItemId,
          userId: ctx.actorUserId,
        });
      }
      if (attempt.status !== "IN_PROGRESS")
        throw new TRPCError({ code: "CONFLICT" });
      if (
        new Set(input.answers.map((answer) => answer.questionId)).size !==
        input.answers.length
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Duplicate questions",
        });
      }
      return withTransactionRetry(() =>
        ctx.db.$transaction(async (tx) => {
          // Serializes saves and submission of this attempt; a finished attempt is a conflict.
          if (!(await lockInProgressAttempt(tx, input.attemptId))) {
            throw new TRPCError({ code: "CONFLICT" });
          }
          const currentAttempt = await tx.assessmentAttempt.findUnique({
            where: { id: input.attemptId },
            select: {
              status: true,
              assessmentId: true,
              startedAt: true,
              assessment: { select: { timeLimitMinutes: true } },
              assessmentEvent: {
                select: {
                  status: true,
                  durationMinutes: true,
                  closesAt: true,
                },
              },
            },
          });
          if (currentAttempt?.status !== "IN_PROGRESS") {
            throw new TRPCError({ code: "CONFLICT" });
          }
          if (
            currentAttempt.assessmentEvent &&
            currentAttempt.assessmentEvent.status !== "OPEN"
          ) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "This assessment event is no longer open",
            });
          }
          if (
            isAssessmentExpired(
              currentAttempt.startedAt,
              currentAttempt.assessmentEvent?.durationMinutes ??
                currentAttempt.assessment.timeLimitMinutes,
              new Date(),
              currentAttempt.assessmentEvent?.closesAt,
            )
          ) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "The assessment time limit has expired",
            });
          }

          const questions = await tx.assessmentQuestion.findMany({
            where: {
              assessmentId: currentAttempt.assessmentId,
              id: { in: input.answers.map((answer) => answer.questionId) },
            },
            select: { id: true, type: true, options: { select: { id: true } } },
          });
          const questionsById = new Map(
            questions.map((question) => [question.id, question]),
          );

          for (const answer of input.answers) {
            const question = questionsById.get(answer.questionId);
            if (!question) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Invalid question",
              });
            }
            const validOptions = new Set(question.options.map(({ id }) => id));
            if (
              answer.optionIds.some((optionId) => !validOptions.has(optionId))
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Invalid option",
              });
            }
            if (
              question.type === "WRITTEN"
                ? answer.optionIds.length > 0
                : answer.content !== undefined
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Answer shape does not match question",
              });
            }
            if (
              question.type === "SINGLE_CHOICE" &&
              answer.optionIds.length > 1
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Select at most one option",
              });
            }
          }

          await tx.assessmentAnswer.createMany({
            data: input.answers.map((answer) => ({
              attemptId: input.attemptId,
              organizationId: attempt.organizationId,
              questionId: answer.questionId,
              ...(answer.content === undefined
                ? {}
                : { content: answer.content }),
            })),
            skipDuplicates: true,
          });

          await tx.$executeRaw(
            buildAssessmentAnswerContentUpdate(input.attemptId, input.answers),
          );

          const savedAnswers = await tx.assessmentAnswer.findMany({
            where: {
              attemptId: input.attemptId,
              questionId: {
                in: input.answers.map((answer) => answer.questionId),
              },
            },
            select: { id: true, questionId: true },
          });
          const answerIdsByQuestionId = new Map(
            savedAnswers.map((answer) => [answer.questionId, answer.id]),
          );
          await tx.assessmentAnswerSelection.deleteMany({
            where: {
              answerId: { in: savedAnswers.map((answer) => answer.id) },
            },
          });
          const selections = input.answers.flatMap((answer) => {
            const answerId = answerIdsByQuestionId.get(answer.questionId);
            return answerId
              ? answer.optionIds.map((optionId) => ({ answerId, optionId }))
              : [];
          });
          if (selections.length) {
            await tx.assessmentAnswerSelection.createMany({
              data: selections,
              skipDuplicates: true,
            });
          }
          return { saved: input.answers.length };
        }),
      );
    }),

  submitAttempt: protectedProcedure
    .input(z.object({ attemptId: id }))
    .mutation(async ({ ctx, input }) => {
      const attempt = await ctx.db.assessmentAttempt.findUnique({
        where: { id: input.attemptId },
        select: {
          userId: true,
          status: true,
          courseItemId: true,
          assessmentEvent: {
            select: {
              status: true,
              participants: {
                where: { userId: ctx.actorUserId },
                select: { invalidatedAt: true },
              },
            },
          },
        },
      });
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.actorUserId)
        throw new TRPCError({ code: "FORBIDDEN" });
      if (attempt.assessmentEvent) {
        if (
          attempt.assessmentEvent.status !== "OPEN" ||
          !attempt.assessmentEvent.participants[0] ||
          attempt.assessmentEvent.participants[0].invalidatedAt
        ) {
          throw new TRPCError({ code: "PRECONDITION_FAILED" });
        }
      } else {
        await requireCourseItemAccess({
          courseItemId: attempt.courseItemId,
          userId: ctx.actorUserId,
        });
      }
      if (attempt.status !== "IN_PROGRESS")
        throw new TRPCError({ code: "CONFLICT" });
      return withTransactionRetry(() =>
        ctx.db.$transaction(async (tx) => {
          // Serializes with saves and event auto-submission of this attempt.
          if (!(await lockInProgressAttempt(tx, input.attemptId))) {
            throw new TRPCError({ code: "CONFLICT" });
          }
          const full = await tx.assessmentAttempt.findUnique({
            where: { id: input.attemptId },
            select: gradableAttemptSelect,
          });
          if (
            full?.userId !== ctx.actorUserId ||
            full.status !== "IN_PROGRESS" ||
            full.assessment.status !== "PUBLISHED" ||
            (full.assessmentEvent && full.assessmentEvent.status !== "OPEN")
          ) {
            throw new TRPCError({ code: "CONFLICT" });
          }
          const now = new Date();
          const expired = isAssessmentExpired(
            full.startedAt,
            full.assessmentEvent?.durationMinutes ??
              full.assessment.timeLimitMinutes,
            now,
            full.assessmentEvent?.closesAt,
          );
          const graded = await gradeInProgressAttempt(tx, full, now);
          if (graded.passed && !full.assessmentEvent) {
            await tx.contentProgress.upsert({
              where: {
                courseItemId_userId: {
                  courseItemId: full.courseItemId,
                  userId: ctx.actorUserId,
                },
              },
              create: {
                courseItemId: full.courseItemId,
                userId: ctx.actorUserId,
                status: "COMPLETED",
                completedAt: now,
              },
              update: { status: "COMPLETED", completedAt: now },
            });
          }
          return {
            status: graded.status,
            score: graded.score,
            maxScore: graded.maxScore,
            expired,
          };
        }),
      );
    }),

  listMyAttempts: protectedProcedure
    .input(z.object({ organizationId: id.optional() }).optional())
    .query(({ ctx, input }) =>
      ctx.db.assessmentAttempt
        .findMany({
          where: {
            organizationId: input?.organizationId,
            userId: ctx.actorUserId,
          },
          orderBy: [{ startedAt: "desc" }, { id: "desc" }],
          take: 50,
          select: {
            id: true,
            courseItemId: true,
            status: true,
            score: true,
            maxScore: true,
            startedAt: true,
            assessment: { select: { title: true } },
            courseItem: { select: { module: { select: { courseId: true } } } },
            assessmentEvent: {
              select: {
                id: true,
                participants: {
                  where: { userId: ctx.actorUserId },
                  select: { invalidatedAt: true },
                },
              },
            },
          },
        })
        .then((attempts) =>
          attempts.map((attempt) => ({
            ...attempt,
            score: attempt.status === "GRADED" ? attempt.score : null,
            maxScore: attempt.status === "GRADED" ? attempt.maxScore : null,
          })),
        ),
    ),
  getMyAttempt: protectedProcedure
    .input(z.object({ attemptId: id }))
    .query(async ({ ctx, input }) => {
      const attempt = await ctx.db.assessmentAttempt.findFirst({
        where: { id: input.attemptId, userId: ctx.actorUserId },
        select: {
          id: true,
          courseItemId: true,
          attemptNumber: true,
          status: true,
          score: true,
          maxScore: true,
          startedAt: true,
          submittedAt: true,
          gradedAt: true,
          assessment: { select: { title: true } },
          courseItem: {
            select: {
              module: {
                select: {
                  title: true,
                  course: { select: { id: true, title: true } },
                },
              },
            },
          },
          assessmentEvent: {
            select: {
              id: true,
              title: true,
              type: true,
              scope: true,
              status: true,
              participants: {
                where: { userId: ctx.actorUserId },
                select: { invalidatedAt: true, invalidationReason: true },
              },
            },
          },
          cohort: { select: { id: true, name: true } },
          answers: {
            select: {
              id: true,
              questionId: true,
              content: true,
              autoScore: true,
              manualScore: true,
              feedback: true,
              selectedOptions: { select: { optionId: true } },
            },
          },
        },
      });
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (!attempt.assessmentEvent) {
        await requireCourseItemAccess({
          courseItemId: attempt.courseItemId,
          userId: ctx.actorUserId,
        });
      }
      const context = assessmentContext(attempt);
      if (
        attempt.status !== "GRADED" ||
        attempt.assessmentEvent?.participants[0]?.invalidatedAt ||
        attempt.assessmentEvent?.status === "CANCELLED"
      ) {
        return {
          ...attempt,
          context,
          score: null,
          maxScore: null,
          gradedAt: null,
          answers: attempt.answers.map(
            ({ autoScore: _a, manualScore: _m, feedback: _f, ...answer }) =>
              answer,
          ),
        };
      }
      return { ...attempt, context };
    }),

  reviewAttempt: protectedProcedure
    .input(
      z.object({
        attemptId: id,
        answers: z
          .array(
            z.object({
              answerId: id,
              score: z.number().int().min(0),
              feedback: json.optional(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const access = await requireReviewAccess(
        ctx.db,
        input.attemptId,
        ctx.actorUserId,
      );
      return withTransactionRetry(() =>
        ctx.db.$transaction(async (tx) => {
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
          if (attempt?.status !== "IN_REVIEW")
            throw new TRPCError({ code: "CONFLICT" });
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
          const reviews = new Map<string, (typeof input.answers)[number]>();
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
                answer.question.type === "WRITTEN" &&
                answer.manualScore === null,
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
          if (finalized.count !== 1)
            throw new TRPCError({
              code: "CONFLICT",
              message: "Another teacher has already completed this review",
            });
          const passed =
            attempt.maxScore !== null &&
            attempt.maxScore > 0 &&
            (attempt.assessment.passingScore === null ||
              (score / attempt.maxScore) * 100 >=
                attempt.assessment.passingScore);
          if (passed && !attempt.assessmentEvent) {
            await tx.contentProgress.upsert({
              where: {
                courseItemId_userId: {
                  courseItemId: attempt.courseItemId,
                  userId: attempt.userId,
                },
              },
              create: {
                courseItemId: attempt.courseItemId,
                userId: attempt.userId,
                status: "COMPLETED",
                completedAt: now,
              },
              update: { status: "COMPLETED", completedAt: now },
            });
          }
          return {
            status: "GRADED" as const,
            score,
            maxScore: attempt.maxScore,
          };
        }),
      );
    }),
  listAttemptsNeedingReview: protectedProcedure
    .input(
      pageInput.extend({
        organizationId: id,
        assessmentId: id.optional(),
        cohortId: id.optional(),
        search: z.string().trim().max(200).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const member = await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "assessment.review",
        userId: ctx.actorUserId,
      });
      if (input.cohortId) {
        const cohort = await ctx.db.cohort.findFirst({
          where: {
            id: input.cohortId,
            organizationId: input.organizationId,
          },
          select: { id: true },
        });
        if (!cohort) throw new TRPCError({ code: "NOT_FOUND" });
        await requireCohortPermission({
          cohortId: input.cohortId,
          permission: "assessment.review",
          userId: ctx.actorUserId,
        });
      }
      const scopedTeacher = member.role === "TEACHER";
      const simplified = member.organization.permissionMode === "SIMPLE";
      const searchFilter: Prisma.AssessmentAttemptWhereInput | undefined =
        input.search
          ? {
              OR: [
                {
                  user: {
                    is: {
                      OR: [
                        {
                          name: {
                            contains: input.search,
                            mode: "insensitive" as const,
                          },
                        },
                        {
                          email: {
                            contains: input.search,
                            mode: "insensitive" as const,
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  assessment: {
                    is: {
                      title: {
                        contains: input.search,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
              ],
            }
          : undefined;
      const teacherFilter: Prisma.AssessmentAttemptWhereInput | undefined =
        scopedTeacher
          ? {
              OR: [
                ...(simplified
                  ? [{ cohortId: null }]
                  : [
                      {
                        courseItem: {
                          module: {
                            course: { ownerMembershipId: member.id },
                          },
                        },
                      },
                    ]),
                {
                  cohort: {
                    is: {
                      staff: {
                        some: {
                          organizationMemberId: member.id,
                          ...(simplified
                            ? {}
                            : { role: "INSTRUCTOR" as const }),
                        },
                      },
                    },
                  },
                },
              ],
            }
          : undefined;
      const where: Prisma.AssessmentAttemptWhereInput = {
        organizationId: input.organizationId,
        assessmentId: input.assessmentId,
        cohortId: input.cohortId,
        status: "IN_REVIEW" as const,
        AND: [searchFilter, teacherFilter].filter(
          (filter): filter is Prisma.AssessmentAttemptWhereInput =>
            filter !== undefined,
        ),
      };
      const [items, total] = await Promise.all([
        ctx.db.assessmentAttempt.findMany({
          where,
          orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          skip: input.cursor ? 1 : undefined,
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
          ? ctx.db.assessmentAttempt.count({ where })
          : Promise.resolve(undefined),
      ]);
      return pageResult(items, input.limit, total);
    }),
});
