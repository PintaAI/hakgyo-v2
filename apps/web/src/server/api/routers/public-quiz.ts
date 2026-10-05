import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  createPublicQuiz,
  createPublicQuizAssetUrls,
  deletePublicQuiz,
  getPublicQuiz,
  getPublicQuizAttempt,
  getPublicQuizForAssessment,
  getPublicQuizLeaderboard,
  getPublicQuizReview,
  getPublicQuizStats,
  hashClientAddress,
  listOrganizationPublicQuizzes,
  listPublicQuizResults,
  resetPublicQuizLeaderboard,
  setPublicQuizAttemptHidden,
  setPublicQuizStatus,
  startPublicQuiz,
  submitPublicQuiz,
  updatePublicQuiz,
} from "~/server/public-quiz/service";

const id = z.string().min(1);
const quizRef = z.object({
  organizationSlug: z.string().min(1).max(100),
  slug: z.string().min(1).max(32),
});
const token = z.string().min(16).max(128);

/**
 * No-signup public quizzes. Staff publish one per assessment; visitors take it without an
 * account and are ranked on a public leaderboard.
 */
export const publicQuizRouter = createTRPCRouter({
  // Staff

  getForAssessment: protectedProcedure
    .input(z.object({ assessmentId: id }))
    .query(({ ctx, input }) =>
      getPublicQuizForAssessment(ctx.db, input.assessmentId, ctx.actorUserId),
    ),
  create: protectedProcedure
    .input(z.object({ assessmentId: id }))
    .mutation(({ ctx, input }) =>
      createPublicQuiz(ctx.db, input.assessmentId, ctx.actorUserId),
    ),
  update: protectedProcedure
    .input(
      z.object({
        quizId: id,
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().trim().max(500).nullable().optional(),
        closesAt: z.date().nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      updatePublicQuiz(ctx.db, input, ctx.actorUserId),
    ),
  setStatus: protectedProcedure
    .input(z.object({ quizId: id, status: z.enum(["OPEN", "CLOSED"]) }))
    .mutation(({ ctx, input }) =>
      setPublicQuizStatus(ctx.db, input, ctx.actorUserId),
    ),
  delete: protectedProcedure
    .input(z.object({ quizId: id }))
    .mutation(({ ctx, input }) =>
      deletePublicQuiz(ctx.db, input.quizId, ctx.actorUserId),
    ),
  listResults: protectedProcedure
    .input(z.object({ quizId: id }))
    .query(({ ctx, input }) =>
      listPublicQuizResults(ctx.db, input.quizId, ctx.actorUserId),
    ),
  stats: protectedProcedure
    .input(z.object({ quizId: id }))
    .query(({ ctx, input }) =>
      getPublicQuizStats(ctx.db, input.quizId, ctx.actorUserId),
    ),
  listForOrganization: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(({ ctx, input }) =>
      listOrganizationPublicQuizzes(
        ctx.db,
        input.organizationId,
        ctx.actorUserId,
      ),
    ),
  setAttemptHidden: protectedProcedure
    .input(z.object({ attemptId: id, hidden: z.boolean() }))
    .mutation(({ ctx, input }) =>
      setPublicQuizAttemptHidden(ctx.db, input, ctx.actorUserId),
    ),
  resetLeaderboard: protectedProcedure
    .input(z.object({ quizId: id }))
    .mutation(({ ctx, input }) =>
      resetPublicQuizLeaderboard(ctx.db, input.quizId, ctx.actorUserId),
    ),

  // Visitors

  get: publicProcedure
    .input(quizRef)
    .query(({ ctx, input }) => getPublicQuiz(ctx.db, input)),
  start: publicProcedure
    .input(
      quizRef.extend({
        displayName: z.string().max(40).nullable().optional(),
        contact: z.string().max(100).nullable().optional(),
        contactConsent: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      startPublicQuiz(ctx.db, input, hashClientAddress(ctx.headers)),
    ),
  getAttempt: publicProcedure
    .input(quizRef.extend({ token }))
    .query(({ ctx, input }) => getPublicQuizAttempt(ctx.db, input)),
  submit: publicProcedure
    .input(
      quizRef.extend({
        token,
        answers: z
          .array(
            z.object({
              questionId: id,
              optionIds: z.array(id).max(50),
            }),
          )
          .max(500),
      }),
    )
    .mutation(({ ctx, input }) => submitPublicQuiz(ctx.db, input)),
  leaderboard: publicProcedure
    .input(quizRef.extend({ token: token.optional() }))
    .query(({ ctx, input }) => getPublicQuizLeaderboard(ctx.db, input)),
  review: publicProcedure
    .input(quizRef.extend({ token }))
    .query(({ ctx, input }) => getPublicQuizReview(ctx.db, input)),
  assetUrls: publicProcedure
    .input(quizRef.extend({ assetIds: z.array(id).min(1).max(100) }))
    .mutation(({ ctx, input }) => createPublicQuizAssetUrls(ctx.db, input)),
});
