import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  PLACEMENT_HANGEUL_STAGE,
  type PlacementStage,
} from "@hakgyo/shared/placement";

import { applyPlacementResult } from "~/server/foundation/placement";
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
  /**
   * The result of the mobile onboarding placement test: the highest stage
   * passed (1–4). App versions from before the staged test send no input,
   * for their Hangeul pass, which is stage 2.
   */
  passHangeulPlacement: protectedProcedure
    .input(z.object({ stage: z.number().int().min(1).max(4) }).optional())
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction((tx) =>
        applyPlacementResult(tx, {
          userId: ctx.actorUserId,
          stage: (input?.stage ?? PLACEMENT_HANGEUL_STAGE) as PlacementStage,
        }),
      );
      return getHangeulVisibility(ctx.db, ctx.actorUserId);
    }),
});
