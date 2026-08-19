import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  requireCoursePermission,
  requireOrganizationMembership,
  requireOrganizationPermission,
} from "~/server/authorization";
import { db } from "~/server/db";

const id = z.string().min(1);
const fields = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(10000).nullable().optional(),
  thumbnailUrl: z.string().url().max(2048).nullable().optional(),
  price: z.number().int().nonnegative().max(2_147_483_647).optional(),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase())
    .optional(),
  enrollmentMode: z.enum(["OPEN", "INVITE_ONLY"]).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  progressionMode: z.enum(["OPEN", "SEQUENTIAL"]).optional(),
});

export const courseRouter = createTRPCRouter({
  listPublished: publicProcedure
    .input(
      z
        .object({
          organizationId: id.optional(),
          limit: z.number().int().min(1).max(100).default(50),
          cursor: id.optional(),
        })
        .default({ limit: 50 }),
    )
    .query(({ ctx, input }) =>
      ctx.db.course.findMany({
        where: {
          status: "PUBLISHED",
          organizationId: input.organizationId,
        },
        take: input.limit,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : undefined,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnailUrl: true,
          price: true,
          currency: true,
          enrollmentMode: true,
          organization: { select: { id: true, name: true, slug: true } },
          _count: { select: { modules: true, cohorts: true } },
        },
      }),
    ),
  getPublished: publicProcedure
    .input(z.object({ courseId: id }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findFirst({
        where: { id: input.courseId, status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnailUrl: true,
          price: true,
          currency: true,
          enrollmentMode: true,
          organization: { select: { id: true, name: true, slug: true } },
          modules: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              position: true,
              items: {
                where: { isPublished: true },
                orderBy: { position: "asc" },
                select: {
                  id: true,
                  type: true,
                  position: true,
                  material: { select: { title: true, description: true } },
                  assessment: { select: { title: true, description: true } },
                  vocabularySet: { select: { title: true, description: true } },
                },
              },
            },
          },
        },
      });
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      return course;
    }),
  list: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      const member = await requireOrganizationMembership({
        ...input,
        userId: ctx.actorUserId,
      });
      const courses = await db.course.findMany({
        where: {
          organizationId: input.organizationId,
          ...(member.organization.permissionMode === "ADVANCED" &&
          member.role === "TEACHER"
            ? {
                OR: [
                  { ownerMembershipId: member.id },
                  {
                    cohorts: {
                      some: {
                        staff: {
                          some: { organizationMemberId: member.id },
                        },
                      },
                    },
                  },
                  {
                    collaborators: {
                      some: { organizationMemberId: member.id, role: "EDITOR" },
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          owner: {
            select: { id: true, user: { select: { id: true, name: true } } },
          },
          collaborators: {
            where: { organizationMemberId: member.id, role: "EDITOR" },
            select: { id: true },
          },
          cohorts: {
            where: {
              staff: { some: { organizationMemberId: member.id } },
            },
            select: { id: true },
          },
          _count: { select: { modules: true, cohorts: true } },
        },
      });
      return courses.map(({ collaborators, cohorts, ...course }) => {
        const canViewAllCohorts =
          member.role === "OWNER" ||
          member.role === "ADMIN" ||
          (member.organization.permissionMode === "ADVANCED" &&
            course.owner.id === member.id);

        return {
          ...course,
          _count: {
            ...course._count,
            cohorts: canViewAllCohorts ? course._count.cohorts : cohorts.length,
          },
          accessRole:
            member.role === "OWNER" ||
            (member.organization.permissionMode === "ADVANCED" &&
              (member.role === "ADMIN" || course.owner.id === member.id)) ||
            (member.organization.permissionMode === "SIMPLE" &&
              member.role === "TEACHER")
              ? ("MANAGER" as const)
              : member.organization.permissionMode === "SIMPLE" &&
                  member.role === "ADMIN"
                ? ("COHORT_MANAGER" as const)
                : collaborators.length > 0
                  ? ("EDITOR" as const)
                  : cohorts.length > 0
                    ? ("COHORT_STAFF" as const)
                    : ("VIEWER" as const),
        };
      });
    }),
  get: protectedProcedure
    .input(z.object({ courseId: id }))
    .query(async ({ ctx, input }) => {
      const access = await requireCoursePermission({
        ...input,
        permission: "course.view",
        userId: ctx.actorUserId,
      });
      const course = await db.course.findUniqueOrThrow({
        where: { id: input.courseId },
        include: {
          owner: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          modules: {
            orderBy: { position: "asc" },
            include: { items: { orderBy: { position: "asc" } } },
          },
        },
      });
      return { ...course, access: access.access };
    }),
  getAccess: protectedProcedure
    .input(z.object({ courseId: id }))
    .query(async ({ ctx, input }) => {
      const course = await requireCoursePermission({
        ...input,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });
      if (!course.access.usesAdvancedPermissions) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.course.findUniqueOrThrow({
        where: { id: input.courseId },
        select: {
          id: true,
          ownerMembershipId: true,
          owner: {
            select: {
              id: true,
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          collaborators: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              role: true,
              organizationMember: {
                select: {
                  id: true,
                  user: {
                    select: { id: true, name: true, email: true, image: true },
                  },
                },
              },
            },
          },
          organization: {
            select: {
              members: {
                where: { id: { not: course.ownerMembershipId } },
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  role: true,
                  user: {
                    select: { id: true, name: true, email: true, image: true },
                  },
                },
              },
            },
          },
        },
      });
    }),
  addEditor: protectedProcedure
    .input(z.object({ courseId: id, organizationMemberId: id }))
    .mutation(async ({ ctx, input }) => {
      const course = await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });
      if (!course.access.usesAdvancedPermissions) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (input.organizationMemberId === course.ownerMembershipId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Course owner already has full access",
        });
      }
      const member = await db.organizationMember.findFirst({
        where: {
          id: input.organizationMemberId,
          organizationId: course.organizationId,
        },
        select: { id: true },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      return db.courseCollaborator.upsert({
        where: {
          courseId_organizationMemberId: {
            courseId: input.courseId,
            organizationMemberId: member.id,
          },
        },
        create: {
          courseId: input.courseId,
          organizationId: course.organizationId,
          organizationMemberId: member.id,
          role: "EDITOR",
        },
        update: { role: "EDITOR" },
      });
    }),
  removeEditor: protectedProcedure
    .input(z.object({ courseId: id, collaboratorId: id }))
    .mutation(async ({ ctx, input }) => {
      const course = await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });
      if (!course.access.usesAdvancedPermissions) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const result = await db.courseCollaborator.deleteMany({
        where: { id: input.collaboratorId, courseId: input.courseId },
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return { removed: true };
    }),
  create: protectedProcedure
    .input(fields.extend({ organizationId: id, ownerMembershipId: id }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "course.create",
        userId: ctx.actorUserId,
      });
      if (
        member.organization.permissionMode === "ADVANCED" &&
        member.role === "TEACHER" &&
        input.ownerMembershipId !== member.id
      )
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Teachers can only create courses they own",
        });
      const owner = await db.organizationMember.findFirst({
        where: {
          id: input.ownerMembershipId,
          organizationId: input.organizationId,
        },
        select: { id: true },
      });
      if (!owner)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Owner must belong to the organization",
        });
      return db.course.create({ data: input });
    }),
  update: protectedProcedure
    .input(
      fields
        .partial()
        .extend({ courseId: id, ownerMembershipId: id.optional() }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });
      const { courseId, ...data } = input;
      if (data.ownerMembershipId) {
        const owner = await db.organizationMember.findFirst({
          where: {
            id: data.ownerMembershipId,
            organizationId: course.organizationId,
          },
        });
        if (!owner)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Owner must belong to the organization",
          });
      }
      if (data.ownerMembershipId) {
        return db.$transaction(async (tx) => {
          const updated = await tx.course.update({
            where: { id: courseId },
            data,
          });
          await tx.courseCollaborator.deleteMany({
            where: {
              courseId,
              organizationMemberId: data.ownerMembershipId,
            },
          });
          return updated;
        });
      }
      return db.course.update({ where: { id: courseId }, data });
    }),
  delete: protectedProcedure
    .input(z.object({ courseId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCoursePermission({
        ...input,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });
      await db.course.delete({ where: { id: input.courseId } });
      return { deleted: true };
    }),
});
