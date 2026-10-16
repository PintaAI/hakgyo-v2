import { z } from "zod";

import {
  analyticsPeriods,
  defaultAnalyticsPeriod,
  resolveAnalyticsRange,
} from "~/lib/analytics/period";
import { getLearnerAnalytics } from "~/server/analytics/learners";
import { getPerformanceAnalytics } from "~/server/analytics/performance";
import { getRevenueAnalytics } from "~/server/analytics/revenue";
import { getAnalyticsSummary } from "~/server/analytics/summary";
import {
  requireRevenueViewer,
  resolveAnalyticsScope,
} from "~/server/analytics/scope";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const analyticsInput = z.object({
  organizationId: z.string().min(1),
  period: z.enum(analyticsPeriods).default(defaultAnalyticsPeriod),
});

export const analyticsRouter = createTRPCRouter({
  /** Paid revenue, pending verification and checkout conversion (owners and admins). */
  revenue: protectedProcedure
    .input(analyticsInput)
    .query(async ({ ctx, input }) => {
      await requireRevenueViewer({
        organizationId: input.organizationId,
        userId: ctx.actorUserId,
      });
      return getRevenueAnalytics(ctx.db, {
        organizationId: input.organizationId,
        range: resolveAnalyticsRange(input.period),
      });
    }),

  /** Learner growth and activity; teachers see the classes they teach. */
  learners: protectedProcedure
    .input(analyticsInput)
    .query(async ({ ctx, input }) => {
      const scope = await resolveAnalyticsScope(ctx.db, {
        organizationId: input.organizationId,
        userId: ctx.actorUserId,
      });
      return getLearnerAnalytics(ctx.db, {
        scope,
        range: resolveAnalyticsRange(input.period),
      });
    }),

  /** Assessment results, course completion and review speed; teachers see their classes. */
  performance: protectedProcedure
    .input(analyticsInput)
    .query(async ({ ctx, input }) => {
      const scope = await resolveAnalyticsScope(ctx.db, {
        organizationId: input.organizationId,
        userId: ctx.actorUserId,
      });
      return getPerformanceAnalytics(ctx.db, {
        scope,
        range: resolveAnalyticsRange(input.period),
      });
    }),

  /** Headline figures for the dashboard; revenue only for owners and admins. */
  summary: protectedProcedure
    .input(analyticsInput)
    .query(async ({ ctx, input }) => {
      const scope = await resolveAnalyticsScope(ctx.db, {
        organizationId: input.organizationId,
        userId: ctx.actorUserId,
      });
      return getAnalyticsSummary(ctx.db, {
        scope,
        range: resolveAnalyticsRange(input.period),
      });
    }),
});
