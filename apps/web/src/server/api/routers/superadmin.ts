import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../../../../generated/prisma/client";

import { createTRPCRouter, superadminProcedure } from "~/server/api/trpc";
import {
  deleteCourseTree,
  deleteOrganizationTree,
} from "~/server/superadmin/deletion";

const pageInput = z.object({
  search: z.string().trim().max(100).default(""),
  page: z.number().int().min(1).default(1),
});

const pageSize = 20;

async function audit(
  database: Database,
  input: {
    actorUserId: string;
    targetUserId?: string;
    targetId?: string;
    targetType?: string;
    action: string;
  },
) {
  await database.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      targetId: input.targetId,
      targetType: input.targetType,
      action: input.action,
      outcome: "success",
    },
  });
}

export const superadminRouter = createTRPCRouter({
  dashboard: superadminProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recentSignIns, users, firstPage] = await Promise.all([
      ctx.db.session.count({ where: { createdAt: { gte: since } } }),
      ctx.db.user.count({ where: { deletedAt: null } }),
      listUsers(ctx.db, { search: "", page: 1 }),
    ]);

    return { metrics: { recentSignIns, users }, users: firstPage };
  }),

  listUsers: superadminProcedure
    .input(pageInput)
    .query(({ ctx, input }) => listUsers(ctx.db, input)),

  updateProfile: superadminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        name: z.string().trim().min(1).max(120),
        image: z.string().url().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, deletedAt: true },
      });
      if (!target || target.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { name: input.name, image: input.image },
      });
      await audit(ctx.db, {
        actorUserId: ctx.actorUserId,
        targetUserId: input.userId,
        action: "update_profile",
      });
      return { success: true };
    }),

  setSuspended: superadminProcedure
    .input(z.object({ userId: z.string().min(1), suspended: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, deletedAt: true },
      });
      if (!target || target.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { suspendedAt: input.suspended ? new Date() : null },
      });
      if (input.suspended) {
        await ctx.db.session.deleteMany({ where: { userId: input.userId } });
      }
      await audit(ctx.db, {
        actorUserId: ctx.actorUserId,
        targetUserId: input.userId,
        action: input.suspended ? "suspend_user" : "restore_user",
      });
      return { success: true };
    }),

  softDelete: superadminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, deletedAt: true },
      });
      if (!target || target.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { deletedAt: new Date(), suspendedAt: new Date() },
      });
      await ctx.db.session.deleteMany({ where: { userId: input.userId } });
      await audit(ctx.db, {
        actorUserId: ctx.actorUserId,
        targetUserId: input.userId,
        action: "soft_delete_user",
      });
      return { success: true };
    }),

  revokeSessions: superadminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.session.deleteMany({ where: { userId: input.userId } });
      await audit(ctx.db, {
        actorUserId: ctx.actorUserId,
        targetUserId: input.userId,
        action: "revoke_sessions",
      });
      return { success: true };
    }),

  listOrganizations: superadminProcedure.query(({ ctx }) =>
    ctx.db.organization.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: { select: { members: true, courses: true } },
      },
    }),
  ),

  listCourses: superadminProcedure.query(({ ctx }) =>
    ctx.db.course.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        organization: { select: { name: true } },
        _count: { select: { modules: true, cohorts: true } },
      },
    }),
  ),

  deleteCourse: superadminProcedure
    .input(z.object({ courseId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteCourseTree(input.courseId, ctx.actorUserId);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return { deleted: true };
    }),

  deleteOrganization: superadminProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteOrganizationTree(
        input.organizationId,
        ctx.actorUserId,
      );
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return { deleted: true };
    }),
});

async function listUsers(database: Database, input: z.infer<typeof pageInput>) {
  const where = input.search
    ? {
        OR: [
          { name: { contains: input.search, mode: "insensitive" as const } },
          { email: { contains: input.search, mode: "insensitive" as const } },
        ],
      }
    : undefined;
  const [users, total] = await Promise.all([
    database.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        suspendedAt: true,
        deletedAt: true,
        createdAt: true,
      },
    }),
    database.user.count({ where }),
  ]);
  // Session counts for this page only; a relation `_count` in the findMany
  // aggregates every session in the database.
  const sessionCounts =
    users.length === 0
      ? []
      : await database.session.groupBy({
          by: ["userId"],
          where: { userId: { in: users.map((user) => user.id) } },
          _count: { _all: true },
        });
  const sessionCountByUser = new Map(
    sessionCounts.map((row) => [row.userId, row._count._all]),
  );
  const items = users.map((user) => ({
    ...user,
    _count: { sessions: sessionCountByUser.get(user.id) ?? 0 },
  }));
  return { items, total, page: input.page, pageSize };
}

type Database = PrismaClient;
