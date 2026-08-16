import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { Prisma } from "../../../../generated/prisma/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireOrganizationPermission } from "~/server/authorization";
import { db } from "~/server/db";
import { revokeZoomConnection } from "~/server/integrations/zoom";

const id = z.string().min(1);
const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const organizationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(120),
        slug,
        defaultEnrollmentMode: z
          .enum(["OPEN", "INVITE_ONLY"])
          .default("INVITE_ONLY"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.organization.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Organization slug is already in use",
        });
      }

      try {
        return await ctx.db.$transaction(async (tx) => {
          const organization = await tx.organization.create({ data: input });
          const membership = await tx.organizationMember.create({
            data: {
              organizationId: organization.id,
              userId: ctx.actorUserId,
              role: "OWNER",
            },
            select: { id: true, role: true },
          });
          return { ...organization, membership };
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Organization slug is already in use",
          });
        }
        throw error;
      }
    }),

  getZoomConnectionStatus: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        ...input,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      return db.zoomConnection.findUnique({
        where: { organizationId: input.organizationId },
        select: {
          id: true,
          status: true,
          zoomAccountId: true,
          zoomUserId: true,
          scope: true,
          accessTokenExpiresAt: true,
          createdAt: true,
          updatedAt: true,
          connectedBy: {
            select: { user: { select: { id: true, name: true } } },
          },
        },
      });
    }),
  disconnectZoom: protectedProcedure
    .input(z.object({ organizationId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        ...input,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      await revokeZoomConnection(input.organizationId);
      return { disconnected: true };
    }),
  list: protectedProcedure.query(({ ctx }) =>
    db.organization.findMany({
      where: { members: { some: { userId: ctx.actorUserId } } },
      orderBy: { name: "asc" },
      include: {
        members: {
          where: { userId: ctx.actorUserId },
          select: { id: true, role: true },
        },
      },
    }),
  ),

  get: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      const membership = await requireOrganizationPermission({
        ...input,
        permission: "course.create",
        userId: ctx.actorUserId,
      });
      const organization = await db.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
      });
      return { ...organization, currentRole: membership.role };
    }),

  update: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        name: z.string().trim().min(1).max(120).optional(),
        slug: slug.optional(),
        defaultEnrollmentMode: z.enum(["OPEN", "INVITE_ONLY"]).optional(),
        teacherCourseAccess: z.enum(["OWN_ONLY", "ALL"]).optional(),
        teacherContentAccess: z.enum(["OWN_ONLY", "ALL"]).optional(),
        teacherCanDeleteContent: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      const { organizationId, ...data } = input;
      try {
        return await db.organization.update({
          where: { id: organizationId },
          data,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Organization slug is already in use",
          });
        }
        throw error;
      }
    }),

  getDashboardAnalytics: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });

      const organizationScope = { organizationId: input.organizationId };
      const [
        members,
        courses,
        cohorts,
        enrollments,
        materials,
        vocabularySets,
        assessments,
        attemptsInReview,
        upcomingMeetings,
      ] = await Promise.all([
        ctx.db.organizationMember.count({ where: organizationScope }),
        ctx.db.course.groupBy({
          by: ["status"],
          where: organizationScope,
          _count: { _all: true },
        }),
        ctx.db.cohort.groupBy({
          by: ["status"],
          where: organizationScope,
          _count: { _all: true },
        }),
        ctx.db.courseEnrollment.groupBy({
          by: ["status"],
          where: { course: organizationScope },
          _count: { _all: true },
        }),
        ctx.db.material.count({ where: organizationScope }),
        ctx.db.vocabularySet.count({ where: organizationScope }),
        ctx.db.assessment.count({ where: organizationScope }),
        ctx.db.assessmentAttempt.count({
          where: { ...organizationScope, status: "IN_REVIEW" },
        }),
        ctx.db.cohortMeeting.count({
          where: {
            ...organizationScope,
            status: "SCHEDULED",
            startsAt: { gte: new Date() },
          },
        }),
      ]);

      const sum = (groups: Array<{ _count: { _all: number } }>) =>
        groups.reduce((total, group) => total + group._count._all, 0);

      return {
        members,
        courses: {
          total: sum(courses),
          byStatus: Object.fromEntries(
            courses.map((group) => [group.status, group._count._all]),
          ),
        },
        cohorts: {
          total: sum(cohorts),
          byStatus: Object.fromEntries(
            cohorts.map((group) => [group.status, group._count._all]),
          ),
        },
        enrollments: {
          total: sum(enrollments),
          byStatus: Object.fromEntries(
            enrollments.map((group) => [group.status, group._count._all]),
          ),
        },
        content: { materials, vocabularySets, assessments },
        actionItems: { attemptsInReview, upcomingMeetings },
      };
    }),

  listMembers: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        ...input,
        permission: "organization.members.manage",
        userId: ctx.actorUserId,
      });
      return db.organizationMember.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });
    }),

  addMember: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        email: z.string().trim().toLowerCase().email().max(320),
        role: z.enum(["OWNER", "ADMIN", "TEACHER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.members.manage",
        userId: ctx.actorUserId,
      });
      if (input.role === "OWNER" && actor.role !== "OWNER")
        throw new TRPCError({ code: "FORBIDDEN" });

      const user = await db.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No Hakgyo account was found for this email",
        });
      }

      const existingMembership = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: user.id,
          },
        },
        select: { id: true },
      });
      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already an organization member",
        });
      }
      return db.organizationMember.create({
        data: {
          organizationId: input.organizationId,
          userId: user.id,
          role: input.role,
        },
      });
    }),

  updateMemberRole: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        membershipId: id,
        role: z.enum(["OWNER", "ADMIN", "TEACHER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.members.manage",
        userId: ctx.actorUserId,
      });
      const member = await db.organizationMember.findFirst({
        where: { id: input.membershipId, organizationId: input.organizationId },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        (member.role === "OWNER" || input.role === "OWNER") &&
        actor.role !== "OWNER"
      )
        throw new TRPCError({ code: "FORBIDDEN" });
      return db.$transaction(async (tx) => {
        if (member.role === "OWNER" && input.role !== "OWNER") {
          const owners = await tx.organizationMember.count({
            where: { organizationId: input.organizationId, role: "OWNER" },
          });
          if (owners <= 1)
            throw new TRPCError({
              code: "CONFLICT",
              message: "Organization must retain at least one owner",
            });
        }
        return tx.organizationMember.update({
          where: { id: member.id },
          data: { role: input.role },
        });
      });
    }),

  removeMember: protectedProcedure
    .input(z.object({ organizationId: id, membershipId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.members.manage",
        userId: ctx.actorUserId,
      });
      const member = await db.organizationMember.findFirst({
        where: { id: input.membershipId, organizationId: input.organizationId },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      if (member.role === "OWNER")
        throw new TRPCError({
          code: "CONFLICT",
          message: "Transfer or demote the owner before removal",
        });
      await db.organizationMember.delete({ where: { id: member.id } });
      return { removed: true };
    }),
});
