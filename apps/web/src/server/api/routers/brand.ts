import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  getActiveBrandContext,
  listAvailableBrandContexts,
} from "~/server/brand/context";

export const brandRouter = createTRPCRouter({
  getContext: publicProcedure
    .input(
      z.object({
        cohortId: z.string().min(1).optional(),
        courseId: z.string().min(1).optional(),
      }),
    )
    .query(({ ctx, input }) =>
      getActiveBrandContext({
        db: ctx.db,
        actorUserId: ctx.actorUserId,
        ...input,
      }),
    ),
  listAvailableContexts: protectedProcedure.query(({ ctx }) =>
    listAvailableBrandContexts({
      db: ctx.db,
      actorUserId: ctx.actorUserId,
    }),
  ),
});
