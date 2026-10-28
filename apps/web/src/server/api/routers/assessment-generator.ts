import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  createEpsSet,
  createEpsSetInput,
  previewEpsSet,
  previewEpsSetInput,
} from "~/server/bank/packages";

/**
 * "Buat set EPS-TOPIK": owners and admins draw a set soal from the Hakgyo bank and save it as an
 * ordinary assessment of their organization. The preview is a mutation because every call draws
 * a new set (unless it repeats a seed).
 */
export const assessmentGeneratorRouter = createTRPCRouter({
  preview: protectedProcedure
    .input(previewEpsSetInput)
    .mutation(({ ctx, input }) =>
      previewEpsSet(ctx.db, input, ctx.actorUserId),
    ),
  create: protectedProcedure
    .input(createEpsSetInput)
    .mutation(({ ctx, input }) => createEpsSet(ctx.db, input, ctx.actorUserId)),
});
