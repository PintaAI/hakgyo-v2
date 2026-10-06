import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "../../../../generated/prisma/client";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { userSearchWhere } from "~/server/api/user-search";
import {
  requireCohortPermission,
  requireCoursePermission,
} from "~/server/authorization";
import {
  getOpenEnrollmentRejection,
  getOpenEnrollmentUpdate,
} from "~/server/enrollment/open-enrollment";
import { withTransactionRetry } from "~/server/db-retry";
import { redeemEnrollmentInvite } from "~/server/enrollment/invite-redemption";
import { upsertDefaultCohortEnrollment } from "~/server/enrollment/default-cohort";
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

/** Cohort invites need `invites.manage` on the cohort; course invites need `course.manage`. */
async function requireInviteManager(
  database: Pick<Prisma.TransactionClient, "enrollmentInvite">,
  inviteId: string,
  userId: string,
) {
  const invite = await database.enrollmentInvite.findUnique({
    where: { id: inviteId },
    select: { courseId: true, cohortId: true },
  });
  if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
  if (invite.cohortId) {
    await requireCohortPermission({
      cohortId: invite.cohortId,
      permission: "invites.manage",
      userId,
    });
  } else {
    await requireCoursePermission({
      courseId: invite.courseId,
      permission: "course.manage",
      userId,
    });
  }
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
  enrollOpenCourse: protectedProcedure
    .input(z.object({ courseId: id }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        select: {
          status: true,
          price: true,
          enrollmentMode: true,
          organization: { select: { defaultEnrollmentMode: true } },
        },
      });
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });

      const rejection = getOpenEnrollmentRejection(course);
      if (rejection === "COURSE_NOT_PUBLISHED") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (rejection === "INVITE_REQUIRED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Kurikulum ini memerlukan undangan.",
        });
      }
      if (rejection === "PAYMENT_REQUIRED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Pendaftaran berbayar belum tersedia.",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        const existing = await tx.cohortEnrollment.findFirst({
          where: {
            userId: ctx.actorUserId,
            cohort: { defaultForCourseId: input.courseId },
          },
        });
        const update = getOpenEnrollmentUpdate(existing, new Date());
        if (!update && existing) return existing;

        const joined = {
          status: "ACTIVE",
          source: "OPEN",
          completedAt: null,
          expiresAt: null,
        } as const;
        return upsertDefaultCohortEnrollment(tx, {
          courseId: input.courseId,
          userId: ctx.actorUserId,
          create: joined,
          update: update ?? joined,
        });
      });
    }),

  listInvites: protectedProcedure
    .input(
      pageInput.extend({
        courseId: id,
        cohortId: id.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.cohortId) {
        const cohort = await requireCohortPermission({
          cohortId: input.cohortId,
          permission: "invites.manage",
          userId: ctx.actorUserId,
        });
        if (cohort.courseId !== input.courseId)
          throw new TRPCError({ code: "BAD_REQUEST" });
      } else {
        await requireCoursePermission({
          courseId: input.courseId,
          permission: "course.manage",
          userId: ctx.actorUserId,
        });
      }
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
      if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
      await requireCoursePermission({
        courseId: invite.courseId,
        permission: "course.manage",
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
  listCourseEnrollments: protectedProcedure
    .input(
      pageInput.extend({
        courseId: id,
        search: z.string().trim().max(200).optional(),
        status: enrollmentStatus.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });
      // Self-paced learners; class cohort learners are listed per cohort.
      const where = {
        cohort: { defaultForCourseId: input.courseId },
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

  setCourseEnrollment: protectedProcedure
    .input(
      z.object({
        courseId: id,
        email: z.string().trim().toLowerCase().email().max(320),
        status: enrollmentStatus,
        expiresAt: z.coerce.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
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
      const completedAt = input.status === "COMPLETED" ? new Date() : null;
      const previous = await ctx.db.cohortEnrollment.findFirst({
        where: {
          userId: user.id,
          cohort: { defaultForCourseId: input.courseId },
        },
        select: { status: true },
      });
      const enrollment = await ctx.db.$transaction((tx) =>
        upsertDefaultCohortEnrollment(tx, {
          courseId: input.courseId,
          userId: user.id,
          create: {
            status: input.status,
            expiresAt: input.expiresAt,
            completedAt,
            source: "MANUAL",
          },
          update: {
            status: input.status,
            expiresAt: input.expiresAt,
            completedAt,
          },
        }),
      );
      await notifyIfActivated(previous?.status, enrollment);
      return enrollment;
    }),

  removeCourseEnrollment: protectedProcedure
    .input(z.object({ courseId: id, userId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });
      // Only self-paced access; class cohort memberships stay.
      const where = {
        userId: input.userId,
        cohort: { defaultForCourseId: input.courseId },
      };
      const previous = await ctx.db.cohortEnrollment.findFirst({
        where,
        select: { cohortId: true, status: true },
      });
      const result = await ctx.db.cohortEnrollment.deleteMany({ where });
      await notifyIfDeactivated(input.userId, previous, result.count);
      return result;
    }),

  setCohortEnrollment: protectedProcedure
    .input(
      z.object({
        cohortId: id,
        email: z.string().trim().toLowerCase().email().max(320),
        status: enrollmentStatus,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
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
          source: "MANUAL",
        },
        update: { status: input.status, completedAt },
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
        cohortId: id.nullable().optional(),
        expiresAt: z.coerce.date().nullable().optional(),
        maxUses: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.cohortId) {
        const cohort = await requireCohortPermission({
          cohortId: input.cohortId,
          permission: "invites.manage",
          userId: ctx.actorUserId,
        });
        if (cohort.courseId !== input.courseId) {
          throw new TRPCError({ code: "BAD_REQUEST" });
        }
      } else {
        await requireCoursePermission({
          courseId: input.courseId,
          permission: "course.manage",
          userId: ctx.actorUserId,
        });
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
