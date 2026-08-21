import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { Prisma } from "../../../../generated/prisma/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { pageInput, pageResult } from "~/server/api/pagination";
import {
  getMissingWrittenQuestionIds,
  groupScoresByValue,
} from "~/server/assessment-logic";
import { orderAssessmentQuestions } from "~/server/assessment-order";
import { isAssessmentExpired } from "~/server/assessment-timing";
import {
  activeEnrollmentStatuses,
  requireCohortPermission,
  requireContentAuthor,
  requireCourseItemAccess,
  requireCoursePermission,
  requireOrganizationPermission,
} from "~/server/authorization";

const id = z.string().min(1);
const json = z.unknown().transform((value) => value as Prisma.InputJsonValue);
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

async function requireReviewAccess(
  db: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  attemptId: string,
  userId: string,
) {
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      organizationId: true,
      cohortId: true,
      userId: true,
      courseItem: { select: { module: { select: { courseId: true } } } },
    },
  });
  if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
  if (attempt.cohortId) {
    await requireCohortPermission({
      cohortId: attempt.cohortId,
      permission: "assessment.review",
      userId,
    });
  } else {
    await requireCoursePermission({
      courseId: attempt.courseItem.module.courseId,
      permission: "course.manage",
      userId,
    });
  }
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: attempt.organizationId,
        userId,
      },
    },
    select: { id: true },
  });
  if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
  return { attempt, membership };
}

export const assessmentRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      const member = await requireContentAuthor({
        ...input,
        userId: ctx.actorUserId,
      });
      return ctx.db.assessment.findMany({
        where: {
          organizationId: input.organizationId,
          ...(member.organization.permissionMode === "ADVANCED" &&
          member.role === "TEACHER"
            ? { createdByMembershipId: member.id }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { questions: true, courseItems: true } } },
      });
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
      await ctx.db.assessment.delete({ where: { id: input.assessmentId } });
      return { deleted: true };
    }),
  createQuestion: protectedProcedure
    .input(questionFields.extend({ assessmentId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireAssessmentManagement(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
      );
      const position = await ctx.db.assessmentQuestion.aggregate({
        where: { assessmentId: input.assessmentId },
        _max: { position: true },
      });
      return ctx.db.assessmentQuestion.create({
        data: { ...input, position: (position._max.position ?? -1) + 1 },
      });
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
      const position = await ctx.db.assessmentOption.aggregate({
        where: { questionId: input.questionId },
        _max: { position: true },
      });
      return ctx.db.assessmentOption.create({
        data: { ...input, position: (position._max.position ?? -1) + 1 },
      });
    }),
  updateOption: protectedProcedure
    .input(optionFields.partial().extend({ optionId: id }))
    .mutation(async ({ ctx, input }) => {
      const option = await ctx.db.assessmentOption.findUnique({
        where: { id: input.optionId },
        select: { question: { select: { assessmentId: true } } },
      });
      if (!option) throw new TRPCError({ code: "NOT_FOUND" });
      await requireAssessmentManagement(
        ctx.db,
        option.question.assessmentId,
        ctx.actorUserId,
      );
      const { optionId, ...data } = input;
      return ctx.db.assessmentOption.update({ where: { id: optionId }, data });
    }),
  deleteOption: protectedProcedure
    .input(z.object({ optionId: id }))
    .mutation(async ({ ctx, input }) => {
      const option = await ctx.db.assessmentOption.findUnique({
        where: { id: input.optionId },
        select: { question: { select: { assessmentId: true } } },
      });
      if (!option) throw new TRPCError({ code: "NOT_FOUND" });
      await requireAssessmentManagement(
        ctx.db,
        option.question.assessmentId,
        ctx.actorUserId,
        "delete",
      );
      await ctx.db.assessmentOption.delete({ where: { id: input.optionId } });
      return { deleted: true };
    }),
  getForCourseItem: protectedProcedure
    .input(z.object({ courseItemId: id, attemptId: id.optional() }))
    .query(async ({ ctx, input }) => {
      await requireCourseItemAccess({
        courseItemId: input.courseItemId,
        userId: ctx.actorUserId,
      });
      const attempt = input.attemptId
        ? await ctx.db.assessmentAttempt.findFirst({
            where: {
              id: input.attemptId,
              courseItemId: input.courseItemId,
              userId: ctx.actorUserId,
            },
            select: { id: true, shuffleSeed: true },
          })
        : null;
      if (input.attemptId && !attempt) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const item = await ctx.db.courseItem.findUnique({
        where: { id: input.courseItemId },
        select: {
          id: true,
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
                  points: true,
                  position: true,
                  options: {
                    orderBy: { position: "asc" },
                    select: { id: true, content: true, position: true },
                  },
                },
              },
            },
          },
        },
      });
      if (item?.assessment?.status !== "PUBLISHED") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return {
        ...item.assessment,
        questions: orderAssessmentQuestions(
          item.assessment.questions,
          attempt?.shuffleSeed ?? attempt?.id ?? input.attemptId,
          item.assessment.shuffleQuestions,
          item.assessment.shuffleOptions,
        ),
      };
    }),

  startAttempt: protectedProcedure
    .input(z.object({ courseItemId: id, cohortId: id.optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireCourseItemAccess({
        courseItemId: input.courseItemId,
        userId: ctx.actorUserId,
      });
      return ctx.db.$transaction(
        async (tx) => {
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
          const cohortEnrollments = await tx.cohortEnrollment.findMany({
            where: {
              userId: ctx.actorUserId,
              status: { in: [...activeEnrollmentStatuses] },
              cohort: {
                courseId: item.module.courseId,
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
            },
            orderBy: { attemptNumber: "desc" },
          });
          if (current) {
            if (current.cohortId && cohortId && current.cohortId !== cohortId) {
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
          const count = await tx.assessmentAttempt.count({
            where: {
              courseItemId: input.courseItemId,
              userId: ctx.actorUserId,
            },
          });
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
              attemptNumber: count + 1,
              shuffleSeed: crypto.randomUUID(),
            },
          });
        },
        { isolationLevel: "Serializable" },
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
          assessmentId: true,
          startedAt: true,
          assessment: { select: { timeLimitMinutes: true } },
        },
      });
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.actorUserId)
        throw new TRPCError({ code: "FORBIDDEN" });
      await requireCourseItemAccess({
        courseItemId: attempt.courseItemId,
        userId: ctx.actorUserId,
      });
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
      return ctx.db.$transaction(async (tx) => {
        const currentAttempt = await tx.assessmentAttempt.findUnique({
          where: { id: input.attemptId },
          select: {
            status: true,
            assessmentId: true,
            startedAt: true,
            assessment: { select: { timeLimitMinutes: true } },
          },
        });
        if (currentAttempt?.status !== "IN_PROGRESS") {
          throw new TRPCError({ code: "CONFLICT" });
        }
        if (
          isAssessmentExpired(
            currentAttempt.startedAt,
            currentAttempt.assessment.timeLimitMinutes,
            new Date(),
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

        const contentRows = Prisma.join(
          input.answers.map(
            (answer) =>
              Prisma.sql`(
                ${answer.questionId},
                ${answer.content !== undefined},
                ${answer.content === undefined ? null : JSON.stringify(answer.content)}
              )`,
          ),
        );
        await tx.$executeRaw(Prisma.sql`
            UPDATE "AssessmentAnswer" AS answer
            SET
              "content" = CASE
                WHEN incoming."hasContent" THEN incoming."content"::jsonb
                ELSE answer."content"
              END,
              "autoScore" = NULL,
              "manualScore" = NULL
            FROM (VALUES ${contentRows}) AS incoming("questionId", "hasContent", "content")
            WHERE answer."attemptId" = ${input.attemptId}
              AND answer."questionId" = incoming."questionId"
          `);

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
          where: { answerId: { in: savedAnswers.map((answer) => answer.id) } },
        });
        const selections = input.answers.flatMap((answer) => {
          const answerId = answerIdsByQuestionId.get(answer.questionId);
          return answerId
            ? answer.optionIds.map((optionId) => ({ answerId, optionId }))
            : [];
        });
        if (selections.length) {
          await tx.assessmentAnswerSelection.createMany({ data: selections });
        }
        return { saved: input.answers.length };
      });
    }),

  submitAttempt: protectedProcedure
    .input(z.object({ attemptId: id }))
    .mutation(async ({ ctx, input }) => {
      const attempt = await ctx.db.assessmentAttempt.findUnique({
        where: { id: input.attemptId },
        select: { userId: true, status: true, courseItemId: true },
      });
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.actorUserId)
        throw new TRPCError({ code: "FORBIDDEN" });
      await requireCourseItemAccess({
        courseItemId: attempt.courseItemId,
        userId: ctx.actorUserId,
      });
      if (attempt.status !== "IN_PROGRESS")
        throw new TRPCError({ code: "CONFLICT" });
      return ctx.db.$transaction(async (tx) => {
        const full = await tx.assessmentAttempt.findUnique({
          where: { id: input.attemptId },
          include: {
            assessment: {
              include: { questions: { include: { options: true } } },
            },
            answers: { include: { selectedOptions: true } },
          },
        });
        if (
          full?.status !== "IN_PROGRESS" ||
          full.assessment.status !== "PUBLISHED"
        ) {
          throw new TRPCError({ code: "CONFLICT" });
        }
        const now = new Date();
        const expired = isAssessmentExpired(
          full.startedAt,
          full.assessment.timeLimitMinutes,
          now,
        );
        const answers = new Map(
          full.answers.map((answer) => [answer.questionId, answer]),
        );
        const missingWrittenQuestionIds = getMissingWrittenQuestionIds(
          full.assessment.questions.map((question) => ({
            id: question.id,
            type: question.type,
            optionIds: question.options.map((option) => option.id),
          })),
          new Set(answers.keys()),
        );
        if (missingWrittenQuestionIds.length) {
          await tx.assessmentAnswer.createMany({
            data: missingWrittenQuestionIds.map((questionId) => ({
              attemptId: full.id,
              organizationId: full.organizationId,
              questionId,
            })),
            skipDuplicates: true,
          });
        }
        let score = 0;
        let maxScore = 0;
        let needsReview = false;
        const autoScores: Array<{ answerId: string; score: number }> = [];
        for (const question of full.assessment.questions) {
          maxScore += question.points;
          const answer = answers.get(question.id);
          if (question.type === "WRITTEN") {
            needsReview = true;
            continue;
          }
          const expected = question.options
            .filter((option) => option.isCorrect)
            .map((option) => option.id)
            .sort();
          const selected = (
            answer?.selectedOptions.map((selection) => selection.optionId) ?? []
          ).sort();
          const autoScore =
            expected.length === selected.length &&
            expected.every((value, index) => value === selected[index])
              ? question.points
              : 0;
          score += autoScore;
          if (answer)
            autoScores.push({ answerId: answer.id, score: autoScore });
        }
        for (const [autoScore, answerIds] of groupScoresByValue(autoScores)) {
          await tx.assessmentAnswer.updateMany({
            where: { id: { in: answerIds } },
            data: { autoScore },
          });
        }
        const updated = await tx.assessmentAttempt.updateMany({
          where: {
            id: input.attemptId,
            userId: ctx.actorUserId,
            status: "IN_PROGRESS",
          },
          data: {
            status: needsReview ? "IN_REVIEW" : "GRADED",
            score,
            maxScore,
            submittedAt: now,
            gradedAt: needsReview ? null : now,
          },
        });
        if (updated.count !== 1) throw new TRPCError({ code: "CONFLICT" });
        const passed =
          !needsReview &&
          maxScore > 0 &&
          (full.assessment.passingScore === null ||
            (score / maxScore) * 100 >= full.assessment.passingScore);
        if (passed) {
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
          status: needsReview ? ("IN_REVIEW" as const) : ("GRADED" as const),
          score,
          maxScore,
          expired,
        };
      });
    }),

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
      await requireCourseItemAccess({
        courseItemId: attempt.courseItemId,
        userId: ctx.actorUserId,
      });
      if (attempt.status === "IN_PROGRESS" || attempt.status === "IN_REVIEW") {
        return {
          ...attempt,
          score: null,
          maxScore: null,
          gradedAt: null,
          answers: attempt.answers.map(
            ({ autoScore: _a, manualScore: _m, feedback: _f, ...answer }) =>
              answer,
          ),
        };
      }
      return attempt;
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
      return ctx.db.$transaction(async (tx) => {
        const attempt = await tx.assessmentAttempt.findUnique({
          where: { id: input.attemptId },
          include: {
            assessment: { select: { passingScore: true } },
            answers: {
              include: { question: { select: { points: true, type: true } } },
            },
          },
        });
        if (attempt?.status !== "IN_REVIEW")
          throw new TRPCError({ code: "CONFLICT" });
        const byId = new Map(
          attempt.answers.map((answer) => [answer.id, answer]),
        );
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
          await tx.assessmentAnswer.update({
            where: { id: answer.id },
            data: {
              manualScore: review.score,
              feedback: review.feedback,
              reviewedByMembershipId: access.membership.id,
              reviewedAt: new Date(),
            },
          });
          answer.manualScore = review.score;
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
        const score = attempt.answers.reduce(
          (total, answer) =>
            total + (answer.manualScore ?? answer.autoScore ?? 0),
          0,
        );
        const now = new Date();
        await tx.assessmentAttempt.update({
          where: { id: attempt.id },
          data: { status: "GRADED", score, gradedAt: now },
        });
        const passed =
          attempt.maxScore !== null &&
          attempt.maxScore > 0 &&
          (attempt.assessment.passingScore === null ||
            (score / attempt.maxScore) * 100 >=
              attempt.assessment.passingScore);
        if (passed) {
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
        return { status: "GRADED" as const, score, maxScore: attempt.maxScore };
      });
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
