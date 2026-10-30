import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "../../../../generated/prisma/client";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { userSearchWhere } from "~/server/api/user-search";
import { requireCohortPermission } from "~/server/authorization";
import { withTransactionRetry } from "~/server/db-retry";
import { redeemEnrollmentInvite } from "~/server/enrollment/invite-redemption";
import { findOtherRunningClass } from "~/server/enrollment/cohort-access";
import { pageArgs, pageInput, pageResult } from "~/server/api/pagination";
import {
  notifyEnrollmentAdded,
  notifyEnrollmentRemoved,
  notifyInBackground,
} from "~/server/notifications/triggers";

const id = z.string().min(1);
const enrollmentStatus = z.enum([
  "PENDING",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
]);

/**
 * One grouped count per list instead of separate total/active counts. The
 * active total ignores the status filter, matching the list header.
 */
function enrollmentTotals(
  statusCounts: Array<{ status: string; _count: { _all: number } }> | undefined,
  status: string | undefined,
) {
  if (!statusCounts) return { total: undefined, activeTotal: undefined };
  const countFor = (value: string) =>
    statusCounts.find((group) => group.status === value)?._count._all ?? 0;
  return {
    total: status
      ? countFor(status)
      : statusCounts.reduce((sum, group) => sum + group._count._all, 0),
    activeTotal: countFor("ACTIVE"),
  };
}

/**
 * Invites belong to a class and need `invites.manage` on it. Course-level
 * invites were retired (and revoked) when learners stopped joining curricula
 * directly, so they are not found.
 */
async function requireInviteManager(
  database: Pick<Prisma.TransactionClient, "enrollmentInvite">,
  inviteId: string,
  userId: string,
) {
  const invite = await database.enrollmentInvite.findUnique({
    where: { id: inviteId },
    select: { cohortId: true },
  });
  if (!invite?.cohortId) throw new TRPCError({ code: "NOT_FOUND" });
  await requireCohortPermission({
    cohortId: invite.cohortId,
    permission: "invites.manage",
    userId,
  });
}

/** Pushes only when a staff change newly grants active access. */
async function notifyIfActivated(
  previousStatus: string | undefined,
  enrollment: { cohortId: string; userId: string; status: string },
) {
  if (enrollment.status !== "ACTIVE" || previousStatus === "ACTIVE") return;
  await notifyInBackground("enrollment added", () =>
    notifyEnrollmentAdded(enrollment.userId, enrollment.cohortId),
  );
}

/** Pushes only when an active membership was actually removed. */
async function notifyIfDeactivated(
  userId: string,
  previous: { cohortId: string; status: string } | null,
  removed: number,
) {
  if (previous?.status !== "ACTIVE" || removed === 0) return;
  const { cohortId } = previous;
  await notifyInBackground("enrollment removed", () =>
    notifyEnrollmentRemoved(userId, cohortId),
  );
}

export const enrollmentRouter = createTRPCRouter({
  listInvites: protectedProcedure
    .input(
      pageInput.extend({
        courseId: id,
        cohortId: id,
      }),
    )
    .query(async ({ ctx, input }) => {
      const cohort = await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "invites.manage",
        userId: ctx.actorUserId,
      });
      if (cohort.courseId !== input.courseId)
        throw new TRPCError({ code: "BAD_REQUEST" });
      const where = { courseId: input.courseId, cohortId: input.cohortId };
      const [items, total] = await Promise.all([
        ctx.db.enrollmentInvite.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          ...pageArgs(input),
          select: {
            id: true,
            cohortId: true,
            expiresAt: true,
            maxUses: true,
            useCount: true,
            revokedAt: true,
            createdAt: true,
            createdBy: {
              select: { user: { select: { id: true, name: true } } },
            },
          },
        }),
        input.includeTotal
          ? ctx.db.enrollmentInvite.count({ where })
          : Promise.resolve(undefined),
      ]);
      return pageResult(items, input.limit, total);
    }),
  getInvite: protectedProcedure
    .input(z.object({ inviteId: id }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.enrollmentInvite.findUnique({
        where: { id: input.inviteId },
        select: {
          id: true,
          courseId: true,
          cohortId: true,
          expiresAt: true,
          maxUses: true,
          useCount: true,
          revokedAt: true,
          createdAt: true,
        },
      });
      if (!invite?.cohortId) throw new TRPCError({ code: "NOT_FOUND" });
      await requireCohortPermission({
        cohortId: invite.cohortId,
        permission: "invites.manage",
        userId: ctx.actorUserId,
      });
      return invite;
    }),
  getInviteByToken: protectedProcedure
    .input(z.object({ token: z.string().min(20).max(200) }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.enrollmentInvite.findUnique({
        where: { token: input.token },
        select: {
          id: true,
          expiresAt: true,
          maxUses: true,
          useCount: true,
          revokedAt: true,
          course: {
            select: {
              id: true,
              title: true,
              organization: { select: { name: true } },
            },
          },
          cohort: { select: { id: true, name: true } },
        },
      });
      if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
      return invite;
    }),
  listCohortEnrollments: protectedProcedure
    .input(
      pageInput.extend({
        cohortId: id,
        search: z.string().trim().max(200).optional(),
        status: enrollmentStatus.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "learners.manage",
        userId: ctx.actorUserId,
      });
      const where = {
        cohortId: input.cohortId,
        status: input.status,
        ...(input.search
          ? { user: { is: userSearchWhere(input.search) } }
          : {}),
      };
      const [items, statusCounts] = await Promise.all([
        ctx.db.cohortEnrollment.findMany({
          where,
          orderBy: [{ enrolledAt: "desc" }, { id: "desc" }],
          ...pageArgs(input),
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        }),
        input.includeTotal
          ? ctx.db.cohortEnrollment.groupBy({
              by: ["status"],
              where: { ...where, status: undefined },
              _count: { _all: true },
            })
          : Promise.resolve(undefined),
      ]);
      const { total, activeTotal } = enrollmentTotals(
        statusCounts,
        input.status,
      );
      return { ...pageResult(items, input.limit, total), activeTotal };
    }),

  setCohortEnrollment: protectedProcedure
    .input(
      z.object({
        cohortId: id,
        email: z.string().trim().toLowerCase().email().max(320),
        status: enrollmentStatus,
        /** Access ends then; null clears it, omitted keeps the current one. */
        expiresAt: z.coerce.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cohort = await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "learners.manage",
        userId: ctx.actorUserId,
      });
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No Hakgyo account was found for this email",
        });
      }
      // Staff may add a learner to the Kelas Mandiri while another class
      // runs: it simply stays paused (see kelas-mandiri.ts).
      if (input.status === "ACTIVE" && cohort.defaultForCourseId === null) {
        const otherClass = await findOtherRunningClass(ctx.db, {
          cohortId: input.cohortId,
          courseId: cohort.courseId,
          userId: user.id,
          now: new Date(),
        });
        if (otherClass) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Learner ini masih aktif di ${otherClass.name}. Keluarkan atau selesaikan dulu dari kelas itu.`,
          });
        }
      }
      const completedAt = input.status === "COMPLETED" ? new Date() : null;
      const previous = await ctx.db.cohortEnrollment.findUnique({
        where: {
          cohortId_userId: { cohortId: input.cohortId, userId: user.id },
        },
        select: { status: true },
      });
      const enrollment = await ctx.db.cohortEnrollment.upsert({
        where: {
          cohortId_userId: { cohortId: input.cohortId, userId: user.id },
        },
        create: {
          cohortId: input.cohortId,
          userId: user.id,
          status: input.status,
          completedAt,
          expiresAt: input.expiresAt,
          source: "MANUAL",
        },
        update: {
          status: input.status,
          completedAt,
          expiresAt: input.expiresAt,
        },
      });
      await notifyIfActivated(previous?.status, enrollment);
      return enrollment;
    }),

  removeCohortEnrollment: protectedProcedure
    .input(z.object({ cohortId: id, userId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "learners.manage",
        userId: ctx.actorUserId,
      });
      const where = { cohortId: input.cohortId, userId: input.userId };
      const previous = await ctx.db.cohortEnrollment.findFirst({
        where,
        select: { cohortId: true, status: true },
      });
      const result = await ctx.db.cohortEnrollment.deleteMany({ where });
      await notifyIfDeactivated(input.userId, previous, result.count);
      return result;
    }),

  createInvite: protectedProcedure
    .input(
      z.object({
        courseId: id,
        cohortId: id,
        expiresAt: z.coerce.date().nullable().optional(),
        maxUses: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cohort = await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "invites.manage",
        userId: ctx.actorUserId,
      });
      if (cohort.courseId !== input.courseId) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        select: { organizationId: true },
      });
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      const membership = await ctx.db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: course.organizationId,
            userId: ctx.actorUserId,
          },
        },
        select: { id: true },
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
      return ctx.db.enrollmentInvite.create({
        data: {
          courseId: input.courseId,
          cohortId: input.cohortId,
          organizationId: course.organizationId,
          createdByMembershipId: membership.id,
          token: `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll(
            "-",
            "",
          ),
          expiresAt: input.expiresAt,
          maxUses: input.maxUses,
        },
        select: {
          id: true,
          token: true,
          expiresAt: true,
          maxUses: true,
          useCount: true,
          cohortId: true,
        },
      });
    }),

  revokeInvite: protectedProcedure
    .input(z.object({ inviteId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireInviteManager(ctx.db, input.inviteId, ctx.actorUserId);
      return ctx.db.enrollmentInvite.update({
        where: { id: input.inviteId },
        data: { revokedAt: new Date() },
        select: { id: true, revokedAt: true },
      });
    }),

  deleteInvite: protectedProcedure
    .input(z.object({ inviteId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireInviteManager(ctx.db, input.inviteId, ctx.actorUserId);
      return ctx.db.enrollmentInvite.delete({
        where: { id: input.inviteId },
        select: { id: true },
      });
    }),

  redeemInvite: protectedProcedure
    .input(z.object({ token: z.string().min(20).max(200) }))
    .mutation(({ ctx, input }) =>
      withTransactionRetry(() =>
        ctx.db.$transaction((tx) =>
          redeemEnrollmentInvite(tx, {
            token: input.token,
            userId: ctx.actorUserId,
            now: new Date(),
          }),
        ),
      ),
    ),
});
