import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma } from "../../../../generated/prisma/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  requireContentAuthor,
  requireCourseItemAccess,
  requireOrganizationPermission,
} from "~/server/authorization";
import { canManageContent } from "~/server/authorization/permissions";

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
      userId: true,
      courseItem: { select: { module: { select: { courseId: true } } } },
    },
  });
  if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
  const course = await db.course.findUnique({
    where: { id: attempt.courseItem.module.courseId },
    select: {
      owner: { select: { userId: true } },
      organization: {
        select: {
          members: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
        },
      },
      cohorts: {
        where: {
          staff: { some: { organizationMember: { userId } } },
          enrollments: { some: { userId: attempt.userId } },
        },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (
    !course ||
    (!canManageContent({
      organizationRole: course.organization.members[0]?.role,
      isCourseOwner: course.owner.userId === userId,
      isCohortStaff: course.cohorts.length > 0,
    }) &&
      course.cohorts.length === 0)
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
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
        userId: ctx.session.user.id,
      });
      return ctx.db.assessment.findMany({
        where: {
          organizationId: input.organizationId,
          ...(member.role === "TEACHER"
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
        ctx.session.user.id,
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
        userId: ctx.session.user.id,
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
        ctx.session.user.id,
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
        ctx.session.user.id,
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
        ctx.session.user.id,
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
        ctx.session.user.id,
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
        ctx.session.user.id,
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
        ctx.session.user.id,
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
        ctx.session.user.id,
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
        ctx.session.user.id,
      );
      await ctx.db.assessmentOption.delete({ where: { id: input.optionId } });
      return { deleted: true };
    }),
  getForCourseItem: protectedProcedure
    .input(z.object({ courseItemId: id }))
    .query(async ({ ctx, input }) => {
      await requireCourseItemAccess({
        courseItemId: input.courseItemId,
        userId: ctx.session.user.id,
      });
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
      return item.assessment;
    }),

  startAttempt: protectedProcedure
    .input(z.object({ courseItemId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCourseItemAccess({
        courseItemId: input.courseItemId,
        userId: ctx.session.user.id,
      });
      return ctx.db.$transaction(
        async (tx) => {
          const item = await tx.courseItem.findUnique({
            where: { id: input.courseItemId },
            select: {
              organizationId: true,
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
          const current = await tx.assessmentAttempt.findFirst({
            where: {
              courseItemId: input.courseItemId,
              userId: ctx.session.user.id,
              status: "IN_PROGRESS",
            },
            orderBy: { attemptNumber: "desc" },
          });
          if (current) return current;
          const count = await tx.assessmentAttempt.count({
            where: {
              courseItemId: input.courseItemId,
              userId: ctx.session.user.id,
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
                userId: ctx.session.user.id,
              },
            },
            create: {
              courseItemId: input.courseItemId,
              userId: ctx.session.user.id,
            },
            update: {},
          });
          return tx.assessmentAttempt.create({
            data: {
              assessmentId: item.assessment.id,
              courseItemId: input.courseItemId,
              organizationId: item.organizationId,
              userId: ctx.session.user.id,
              attemptNumber: count + 1,
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
        },
      });
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.session.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      await requireCourseItemAccess({
        courseItemId: attempt.courseItemId,
        userId: ctx.session.user.id,
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
      return ctx.db.$transaction(
        async (tx) => {
          const currentAttempt = await tx.assessmentAttempt.findUnique({
            where: { id: input.attemptId },
            select: { status: true },
          });
          if (currentAttempt?.status !== "IN_PROGRESS") {
            throw new TRPCError({ code: "CONFLICT" });
          }
          for (const answer of input.answers) {
            const question = await tx.assessmentQuestion.findFirst({
              where: {
                id: answer.questionId,
                assessment: { attempts: { some: { id: input.attemptId } } },
              },
              select: { type: true, options: { select: { id: true } } },
            });
            if (!question)
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Invalid question",
              });
            const validOptions = new Set(
              question.options.map((option) => option.id),
            );
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
            const saved = await tx.assessmentAnswer.upsert({
              where: {
                attemptId_questionId: {
                  attemptId: input.attemptId,
                  questionId: answer.questionId,
                },
              },
              create: {
                attemptId: input.attemptId,
                organizationId: attempt.organizationId,
                questionId: answer.questionId,
                content: answer.content,
              },
              update: {
                content: answer.content,
                autoScore: null,
                manualScore: null,
                feedback: undefined,
              },
            });
            await tx.assessmentAnswerSelection.deleteMany({
              where: { answerId: saved.id },
            });
            if (answer.optionIds.length) {
              await tx.assessmentAnswerSelection.createMany({
                data: answer.optionIds.map((optionId) => ({
                  answerId: saved.id,
                  optionId,
                })),
              });
            }
          }
          return { saved: input.answers.length };
        },
        { isolationLevel: "Serializable" },
      );
    }),

  submitAttempt: protectedProcedure
    .input(z.object({ attemptId: id }))
    .mutation(async ({ ctx, input }) => {
      const attempt = await ctx.db.assessmentAttempt.findUnique({
        where: { id: input.attemptId },
        select: { userId: true, status: true, courseItemId: true },
      });
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.session.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      await requireCourseItemAccess({
        courseItemId: attempt.courseItemId,
        userId: ctx.session.user.id,
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
        const answers = new Map(
          full.answers.map((answer) => [answer.questionId, answer]),
        );
        let score = 0;
        let maxScore = 0;
        let needsReview = false;
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
            await tx.assessmentAnswer.update({
              where: { id: answer.id },
              data: { autoScore },
            });
        }
        const now = new Date();
        const updated = await tx.assessmentAttempt.updateMany({
          where: {
            id: input.attemptId,
            userId: ctx.session.user.id,
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
                userId: ctx.session.user.id,
              },
            },
            create: {
              courseItemId: full.courseItemId,
              userId: ctx.session.user.id,
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
        };
      });
    }),

  getMyAttempt: protectedProcedure
    .input(z.object({ attemptId: id }))
    .query(async ({ ctx, input }) => {
      const attempt = await ctx.db.assessmentAttempt.findFirst({
        where: { id: input.attemptId, userId: ctx.session.user.id },
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
        userId: ctx.session.user.id,
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
        ctx.session.user.id,
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
    .input(z.object({ organizationId: id, assessmentId: id.optional() }))
    .query(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "assessment.review",
        userId: ctx.session.user.id,
      });
      return ctx.db.assessmentAttempt.findMany({
        where: {
          organizationId: input.organizationId,
          assessmentId: input.assessmentId,
          status: "IN_REVIEW",
        },
        orderBy: { submittedAt: "asc" },
        select: {
          id: true,
          assessmentId: true,
          courseItemId: true,
          attemptNumber: true,
          submittedAt: true,
          assessment: { select: { title: true } },
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
      });
    }),
});
