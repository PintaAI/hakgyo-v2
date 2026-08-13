import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  requireCoursePermission,
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
        })
        .default({}),
    )
    .query(({ ctx, input }) =>
      ctx.db.course.findMany({
        where: {
          status: "PUBLISHED",
          organizationId: input.organizationId,
        },
        take: input.limit,
        orderBy: { createdAt: "desc" },
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
      const member = await requireOrganizationPermission({
        ...input,
        permission: "course.create",
        userId: ctx.session.user.id,
      });
      return db.course.findMany({
        where: {
          organizationId: input.organizationId,
          ...(member.role === "TEACHER" ? { ownerMembershipId: member.id } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          owner: {
            select: { id: true, user: { select: { id: true, name: true } } },
          },
          _count: { select: { modules: true, cohorts: true } },
        },
      });
    }),
  get: protectedProcedure
    .input(z.object({ courseId: id }))
    .query(async ({ ctx, input }) => {
      await requireCoursePermission({
        ...input,
        permission: "course.manage",
        userId: ctx.session.user.id,
      });
      return db.course.findUniqueOrThrow({
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
    }),
  create: protectedProcedure
    .input(fields.extend({ organizationId: id, ownerMembershipId: id }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "course.create",
        userId: ctx.session.user.id,
      });
      if (
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
        userId: ctx.session.user.id,
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
      return db.course.update({ where: { id: courseId }, data });
    }),
  delete: protectedProcedure
    .input(z.object({ courseId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCoursePermission({
        ...input,
        permission: "course.manage",
        userId: ctx.session.user.id,
      });
      await db.course.delete({ where: { id: input.courseId } });
      return { deleted: true };
    }),
});
