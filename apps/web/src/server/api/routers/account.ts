import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getAccountDeletionBlockers } from "~/server/account/deletion";

export const accountRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) =>
    ctx.db.user.findUniqueOrThrow({ where: { id: ctx.actorUserId } }),
  ),
  deletionBlockers: protectedProcedure.query(({ ctx }) =>
    getAccountDeletionBlockers(ctx.actorUserId),
  ),
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
