import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  getHangeulVisibility,
  setShowHangeulAfterMastery,
} from "~/server/preferences/hangeul-visibility";

/** Per-user settings shared by web and mobile (stored in `UserPreference`). */
export const preferencesRouter = createTRPCRouter({
  get: protectedProcedure.query(({ ctx }) =>
    getHangeulVisibility(ctx.db, ctx.actorUserId),
  ),
  setShowHangeulAfterMastery: protectedProcedure
    .input(z.object({ show: z.boolean() }))
    .mutation(({ ctx, input }) =>
      setShowHangeulAfterMastery(ctx.db, ctx.actorUserId, input.show),
    ),
});
