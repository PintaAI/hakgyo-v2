import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireOrganizationPermission } from "~/server/authorization";
import { db } from "~/server/db";
import { revokeZoomConnection } from "~/server/integrations/zoom";

const id = z.string().min(1);

export const organizationRouter = createTRPCRouter({
  getZoomConnectionStatus: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        ...input,
        permission: "organization.manage",
        userId: ctx.session.user.id,
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
        userId: ctx.session.user.id,
      });
      await revokeZoomConnection(input.organizationId);
      return { disconnected: true };
    }),
  list: protectedProcedure.query(({ ctx }) =>
    db.organization.findMany({
      where: { members: { some: { userId: ctx.session.user.id } } },
      orderBy: { name: "asc" },
      include: {
        members: {
          where: { userId: ctx.session.user.id },
          select: { id: true, role: true },
        },
      },
    }),
  ),

  get: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        ...input,
        permission: "course.create",
        userId: ctx.session.user.id,
      });
      return db.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        name: z.string().trim().min(1).max(120).optional(),
        slug: z
          .string()
          .trim()
          .min(2)
          .max(80)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .optional(),
        defaultEnrollmentMode: z.enum(["OPEN", "INVITE_ONLY"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.manage",
        userId: ctx.session.user.id,
      });
      const { organizationId, ...data } = input;
      return db.organization.update({ where: { id: organizationId }, data });
    }),

  listMembers: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        ...input,
        permission: "organization.members.manage",
        userId: ctx.session.user.id,
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
        userId: id,
        role: z.enum(["OWNER", "ADMIN", "TEACHER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.members.manage",
        userId: ctx.session.user.id,
      });
      if (input.role === "OWNER" && actor.role !== "OWNER")
        throw new TRPCError({ code: "FORBIDDEN" });
      return db.organizationMember.create({ data: input });
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
        userId: ctx.session.user.id,
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
        userId: ctx.session.user.id,
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
