import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  requireAssessmentManagement,
  requireEditableAssessment,
} from "~/server/assessment/access";
import {
  attachAsset,
  createOption,
  createQuestion,
  deleteOption,
  duplicateAssessment,
  listAssessmentsForAuthor,
  updateOption,
} from "~/server/assessment/authoring";
import {
  assessmentFields,
  attemptsNeedingReviewInput,
  id,
  optionFields,
  questionFields,
  reviewAttemptInput,
  saveAnswersInput,
} from "~/server/assessment/inputs";
import {
  getLearnerAssessment,
  getMyAttempt,
  listMyAttempts,
  saveAnswers,
  startAttempt,
  submitAttempt,
} from "~/server/assessment/learner-attempts";
import { getAssessmentLiveStatus } from "~/server/assessment/live-status";
import {
  getRegisterFilters,
  getReviewAttempt,
  listAttemptsNeedingReview,
  reviewAttempt,
} from "~/server/assessment/review";
import {
  listRegisteredAttempts,
  registerInput,
  reviewScope,
} from "~/server/assessment-register";
import {
  requireContentAuthor,
  requireOrganizationPermission,
} from "~/server/authorization";
import { deleteAssessmentWithProgress } from "~/server/content-resource-deletion";
import { assertPlacementsRemovable } from "~/server/course/readiness-service";

/**
 * Assessment library, authoring, learner attempts and teacher review. Procedures validate
 * input and delegate to the services in `~/server/assessment`.
 */
export const assessmentRouter = createTRPCRouter({
  // Attempt register and review

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
    .query(({ ctx, input }) =>
      getRegisterFilters(ctx.db, input.organizationId, ctx.actorUserId),
    ),
  getReviewAttempt: protectedProcedure
    .input(z.object({ attemptId: id }))
    .query(({ ctx, input }) =>
      getReviewAttempt(ctx.db, input.attemptId, ctx.actorUserId),
    ),
  listMyAttemptHistory: protectedProcedure
    .input(registerInput)
    .query(({ ctx, input }) =>
      listRegisteredAttempts(ctx.db, { userId: ctx.actorUserId }, input),
    ),

  // Library and authoring

  list: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(({ ctx, input }) =>
      listAssessmentsForAuthor(ctx.db, input.organizationId, ctx.actorUserId),
    ),
  get: protectedProcedure
    .input(z.object({ assessmentId: id }))
    .query(async ({ ctx, input }) => {
      await requireAssessmentManagement(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
      );
      const [assessment, live] = await Promise.all([
        ctx.db.assessment.findUniqueOrThrow({
          where: { id: input.assessmentId },
          include: {
            questions: {
              orderBy: { position: "asc" },
              include: { options: { orderBy: { position: "asc" } } },
            },
          },
        }),
        getAssessmentLiveStatus(ctx.db, input.assessmentId),
      ]);
      return { ...assessment, live };
    }),
  /** Where the assessment is live (read-only while live). */
  getLiveStatus: protectedProcedure
    .input(z.object({ assessmentId: id }))
    .query(async ({ ctx, input }) => {
      await requireAssessmentManagement(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
      );
      return getAssessmentLiveStatus(ctx.db, input.assessmentId);
    }),
  duplicate: protectedProcedure
    .input(z.object({ assessmentId: id }))
    .mutation(({ ctx, input }) =>
      duplicateAssessment(ctx.db, input.assessmentId, ctx.actorUserId),
    ),
  create: protectedProcedure
    .input(assessmentFields.extend({ organizationId: id }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireContentAuthor({
        organizationId: input.organizationId,
        userId: ctx.actorUserId,
      });
      return ctx.db.assessment.create({
        data: { ...input, createdByMembershipId: member.id },
      });
    }),
  update: protectedProcedure
    .input(assessmentFields.partial().extend({ assessmentId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireEditableAssessment(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
      );
      const { assessmentId, ...data } = input;
      return ctx.db.assessment.update({ where: { id: assessmentId }, data });
    }),
  delete: protectedProcedure
    .input(z.object({ assessmentId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireEditableAssessment(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
        "delete",
      );
      const placements = await ctx.db.courseItem.findMany({
        where: { assessmentId: input.assessmentId },
        select: { id: true },
      });
      await assertPlacementsRemovable(
        ctx.db,
        placements.map(({ id }) => id),
        "delete",
        "Tugas ini",
      );
      const removed = await ctx.db.$transaction((tx) =>
        deleteAssessmentWithProgress(tx, input.assessmentId),
      );
      return { deleted: true, removed };
    }),
  createQuestion: protectedProcedure
    .input(questionFields.extend({ assessmentId: id }))
    .mutation(({ ctx, input }) =>
      createQuestion(ctx.db, input, ctx.actorUserId),
    ),
  updateQuestion: protectedProcedure
    .input(questionFields.partial().extend({ questionId: id }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.db.assessmentQuestion.findUnique({
        where: { id: input.questionId },
        select: { assessmentId: true },
      });
      if (!question) throw new TRPCError({ code: "NOT_FOUND" });
      await requireEditableAssessment(
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
      await requireEditableAssessment(
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
    .mutation(({ ctx, input }) => createOption(ctx.db, input, ctx.actorUserId)),
  updateOption: protectedProcedure
    .input(optionFields.partial().extend({ optionId: id }))
    .mutation(({ ctx, input }) => updateOption(ctx.db, input, ctx.actorUserId)),
  deleteOption: protectedProcedure
    .input(z.object({ optionId: id }))
    .mutation(({ ctx, input }) =>
      deleteOption(ctx.db, input.optionId, ctx.actorUserId),
    ),
  attachAsset: protectedProcedure
    .input(z.object({ assessmentId: id, assetId: id }))
    .mutation(({ ctx, input }) => attachAsset(ctx.db, input, ctx.actorUserId)),
  detachAsset: protectedProcedure
    .input(z.object({ assessmentId: id, assetId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireEditableAssessment(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
      );
      await ctx.db.assessmentAsset.deleteMany({ where: input });
      return { detached: true };
    }),

  // Learner attempts

  getForCourseItem: protectedProcedure
    .input(z.object({ courseItemId: id, attemptId: id.optional() }))
    .query(({ ctx, input }) =>
      getLearnerAssessment(ctx.db, input, ctx.actorUserId),
    ),
  startAttempt: protectedProcedure
    .input(z.object({ courseItemId: id, cohortId: id.optional() }))
    .mutation(({ ctx, input }) => startAttempt(ctx.db, input, ctx.actorUserId)),
  saveAnswers: protectedProcedure
    .input(saveAnswersInput)
    .mutation(({ ctx, input }) => saveAnswers(ctx.db, input, ctx.actorUserId)),
  submitAttempt: protectedProcedure
    .input(z.object({ attemptId: id }))
    .mutation(({ ctx, input }) =>
      submitAttempt(ctx.db, input.attemptId, ctx.actorUserId),
    ),
  listMyAttempts: protectedProcedure
    .input(z.object({ organizationId: id.optional() }).optional())
    .query(({ ctx, input }) =>
      listMyAttempts(ctx.db, ctx.actorUserId, input?.organizationId),
    ),
  getMyAttempt: protectedProcedure
    .input(z.object({ attemptId: id }))
    .query(({ ctx, input }) =>
      getMyAttempt(ctx.db, input.attemptId, ctx.actorUserId),
    ),

  // Teacher review

  reviewAttempt: protectedProcedure
    .input(reviewAttemptInput)
    .mutation(({ ctx, input }) =>
      reviewAttempt(ctx.db, input, ctx.actorUserId),
    ),
  listAttemptsNeedingReview: protectedProcedure
    .input(attemptsNeedingReviewInput)
    .query(({ ctx, input }) =>
      listAttemptsNeedingReview(ctx.db, input, ctx.actorUserId),
    ),
});
