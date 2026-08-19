import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  requireCohortPermission,
  requireCoursePermission,
} from "~/server/authorization";
import {
  getOpenEnrollmentRejection,
  getOpenEnrollmentUpdate,
} from "~/server/enrollment/open-enrollment";
import { redeemEnrollmentInvite } from "~/server/enrollment/invite-redemption";

const id = z.string().min(1);
const enrollmentStatus = z.enum([
  "PENDING",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
]);

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
          message: "This course requires an invite",
        });
      }
      if (rejection === "PAYMENT_REQUIRED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Paid enrollment is not available yet",
        });
      }

      const existing = await ctx.db.courseEnrollment.findUnique({
        where: {
          courseId_userId: {
            courseId: input.courseId,
            userId: ctx.actorUserId,
          },
        },
      });
      const update = getOpenEnrollmentUpdate(existing, new Date());
      if (!update && existing) return existing;

      return ctx.db.courseEnrollment.upsert({
        where: {
          courseId_userId: {
            courseId: input.courseId,
            userId: ctx.actorUserId,
          },
        },
        create: {
          courseId: input.courseId,
          userId: ctx.actorUserId,
          status: "ACTIVE",
          source: "OPEN",
        },
        update: update ?? {
          status: "ACTIVE",
          source: "OPEN",
          completedAt: null,
          expiresAt: null,
        },
      });
    }),

  listInvites: protectedProcedure
    .input(z.object({ courseId: id, cohortId: id.optional() }))
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
      return ctx.db.enrollmentInvite.findMany({
        where: { courseId: input.courseId, cohortId: input.cohortId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          cohortId: true,
          expiresAt: true,
          maxUses: true,
          useCount: true,
          revokedAt: true,
          createdAt: true,
          createdBy: { select: { user: { select: { id: true, name: true } } } },
        },
      });
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
    .input(z.object({ courseId: id }))
    .query(async ({ ctx, input }) => {
      await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });
      return ctx.db.courseEnrollment.findMany({
        where: { courseId: input.courseId },
        orderBy: { enrolledAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    }),

  listCohortEnrollments: protectedProcedure
    .input(z.object({ cohortId: id }))
    .query(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "learners.manage",
        userId: ctx.actorUserId,
      });
      return ctx.db.cohortEnrollment.findMany({
        where: { cohortId: input.cohortId },
        orderBy: { enrolledAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
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
      return ctx.db.courseEnrollment.upsert({
        where: {
          courseId_userId: { courseId: input.courseId, userId: user.id },
        },
        create: {
          courseId: input.courseId,
          userId: user.id,
          status: input.status,
          expiresAt: input.expiresAt,
          completedAt: input.status === "COMPLETED" ? new Date() : null,
          source: "MANUAL",
        },
        update: {
          status: input.status,
          expiresAt: input.expiresAt,
          completedAt: input.status === "COMPLETED" ? new Date() : null,
        },
      });
    }),

  removeCourseEnrollment: protectedProcedure
    .input(z.object({ courseId: id, userId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });
      return ctx.db.courseEnrollment.deleteMany({
        where: {
          courseId: input.courseId,
          userId: input.userId,
        },
      });
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
      return ctx.db.$transaction(async (tx) => {
        const cohortEnrollment = await tx.cohortEnrollment.upsert({
          where: {
            cohortId_userId: {
              cohortId: input.cohortId,
              userId: user.id,
            },
          },
          create: {
            cohortId: input.cohortId,
            userId: user.id,
            status: input.status,
            completedAt: input.status === "COMPLETED" ? new Date() : null,
            source: "MANUAL",
          },
          update: {
            status: input.status,
            completedAt: input.status === "COMPLETED" ? new Date() : null,
          },
        });
        if (input.status === "ACTIVE" || input.status === "COMPLETED") {
          const courseEnrollment = await tx.courseEnrollment.findUnique({
            where: {
              courseId_userId: {
                courseId: cohort.courseId,
                userId: user.id,
              },
            },
            select: { id: true, source: true },
          });
          if (!courseEnrollment) {
            await tx.courseEnrollment.create({
              data: {
                courseId: cohort.courseId,
                userId: user.id,
                status: "ACTIVE",
                source: "COHORT",
              },
            });
          } else if (courseEnrollment.source === "COHORT") {
            await tx.courseEnrollment.update({
              where: { id: courseEnrollment.id },
              data: { status: "ACTIVE", completedAt: null },
            });
          }
        } else {
          const otherActiveCohortEnrollment =
            await tx.cohortEnrollment.findFirst({
              where: {
                userId: user.id,
                cohortId: { not: input.cohortId },
                status: { in: ["ACTIVE", "COMPLETED"] },
                cohort: { courseId: cohort.courseId },
              },
              select: { id: true },
            });
          if (!otherActiveCohortEnrollment) {
            await tx.courseEnrollment.updateMany({
              where: {
                courseId: cohort.courseId,
                userId: user.id,
                source: "COHORT",
              },
              data: { status: "CANCELLED", completedAt: null },
            });
          }
        }
        return cohortEnrollment;
      });
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
      const invite = await ctx.db.enrollmentInvite.findUnique({
        where: { id: input.inviteId },
        select: { courseId: true, cohortId: true },
      });
      if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
      if (invite.cohortId) {
        await requireCohortPermission({
          cohortId: invite.cohortId,
          permission: "invites.manage",
          userId: ctx.actorUserId,
        });
      } else {
        await requireCoursePermission({
          courseId: invite.courseId,
          permission: "course.manage",
          userId: ctx.actorUserId,
        });
      }
      return ctx.db.enrollmentInvite.update({
        where: { id: input.inviteId },
        data: { revokedAt: new Date() },
        select: { id: true, revokedAt: true },
      });
    }),

  redeemInvite: protectedProcedure
    .input(z.object({ token: z.string().min(20).max(200) }))
    .mutation(({ ctx, input }) =>
      ctx.db.$transaction(
        (tx) =>
          redeemEnrollmentInvite(tx, {
            token: input.token,
            userId: ctx.actorUserId,
            now: new Date(),
          }),
        { isolationLevel: "Serializable" },
      ),
    ),
});
