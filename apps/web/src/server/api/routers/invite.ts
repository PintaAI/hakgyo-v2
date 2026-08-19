import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { redeemEnrollmentInvite } from "~/server/enrollment/invite-redemption";
import { resolveUnifiedInvite } from "~/server/invites/unified";
import {
  acceptOrganizationInvite,
  hashOrganizationInviteToken,
} from "~/server/organization/invites";

const tokenInput = z.object({ token: z.string().min(20).max(200) });

export const inviteRouter = createTRPCRouter({
  preview: publicProcedure.input(tokenInput).query(async ({ ctx, input }) => {
    const user = ctx.actorUserId
      ? await ctx.db.user.findUnique({
          where: { id: ctx.actorUserId },
          select: { email: true },
        })
      : null;
    return resolveUnifiedInvite(ctx.db, input.token, new Date(), user?.email);
  }),

  accept: protectedProcedure
    .input(tokenInput)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.actorUserId },
        select: { email: true },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.$transaction(
        async (tx) => {
          const organizationInvite = await tx.organizationInvite.findUnique({
            where: {
              tokenHash: hashOrganizationInviteToken(input.token),
            },
            select: { id: true },
          });
          if (organizationInvite) {
            const result = await acceptOrganizationInvite(tx, {
              token: input.token,
              userId: ctx.actorUserId,
              userEmail: user.email,
              now: new Date(),
            });
            const destination = `/workspace/${result.organization.slug}/${result.membership.role === "ADMIN" ? "dashboard" : "courses"}`;
            return {
              type: "ORGANIZATION" as const,
              destination,
              organization: result.organization,
              role: result.membership.role,
            };
          }

          const result = await redeemEnrollmentInvite(tx, {
            token: input.token,
            userId: ctx.actorUserId,
            now: new Date(),
          });
          return {
            ...result,
            destination: `/learn/${result.courseId}`,
          };
        },
        { isolationLevel: "Serializable" },
      );
    }),
});
