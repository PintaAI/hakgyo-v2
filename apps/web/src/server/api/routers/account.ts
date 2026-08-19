import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getAccountDeletionBlockers } from "~/server/account/deletion";
import { mcpResource, mcpScope } from "~/server/mcp/config";

export const accountRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) =>
    ctx.db.user.findUniqueOrThrow({ where: { id: ctx.actorUserId } }),
  ),
  deletionBlockers: protectedProcedure.query(({ ctx }) =>
    getAccountDeletionBlockers(ctx.actorUserId),
  ),
  listMcpAuthorizations: protectedProcedure.query(async ({ ctx }) => {
    const consents = await ctx.db.oauthConsent.findMany({
      where: {
        userId: ctx.actorUserId,
        resources: { has: mcpResource },
        scopes: { has: mcpScope },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        scopes: true,
        client: {
          select: {
            clientId: true,
            name: true,
            uri: true,
            icon: true,
            accessTokens: {
              where: { userId: ctx.actorUserId, revoked: null },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { expiresAt: true },
            },
            refreshTokens: {
              where: { userId: ctx.actorUserId, revoked: null },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { expiresAt: true },
            },
          },
        },
      },
    });

    return consents.map(({ client, ...consent }) => ({
      ...consent,
      clientId: client.clientId,
      name: client.name ?? "MCP client",
      uri: client.uri,
      icon: client.icon,
      accessTokenExpiresAt: client.accessTokens[0]?.expiresAt ?? null,
      refreshTokenExpiresAt: client.refreshTokens[0]?.expiresAt ?? null,
    }));
  }),
  revokeMcpAuthorization: protectedProcedure
    .input(z.object({ clientId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const consent = await ctx.db.oauthConsent.findFirst({
        where: {
          clientId: input.clientId,
          userId: ctx.actorUserId,
          resources: { has: mcpResource },
          scopes: { has: mcpScope },
        },
        select: { id: true },
      });
      if (!consent) return { revoked: false };

      const revoked = new Date();
      await ctx.db.$transaction([
        ctx.db.oauthAccessToken.updateMany({
          where: {
            clientId: input.clientId,
            userId: ctx.actorUserId,
            revoked: null,
            resources: { has: mcpResource },
            scopes: { has: mcpScope },
          },
          data: { revoked },
        }),
        ctx.db.oauthRefreshToken.updateMany({
          where: {
            clientId: input.clientId,
            userId: ctx.actorUserId,
            revoked: null,
            resources: { has: mcpResource },
            scopes: { has: mcpScope },
          },
          data: { revoked },
        }),
        ctx.db.oauthConsent.deleteMany({
          where: { id: consent.id },
        }),
      ]);
      return { revoked: true };
    }),
  updateProfile: protectedProcedure
    .input(
      z
        .object({
          name: z.string().trim().min(1).max(120).optional(),
          image: z.string().url().max(2048).nullable().optional(),
        })
        .refine(
          (input) => input.name !== undefined || input.image !== undefined,
          {
            message: "At least one profile field is required",
          },
        ),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.user.update({
        where: { id: ctx.actorUserId },
        data: input,
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ),
});
