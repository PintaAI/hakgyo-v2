import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { MAX_LANDING_FIELD_LENGTH } from "~/lib/organization-landing";
import {
  getLandingDraft,
  getLandingStatus,
  listLandingRevisions,
  publishLandingPage,
  restoreLandingRevision,
  unpublishLandingPage,
  updateLandingCopy,
} from "~/server/organization-landing/service";

const organizationInput = z.object({ organizationId: z.string().min(1) });
const revisionId = z.string().min(1).nullable();

export const organizationLandingRouter = createTRPCRouter({
  get: protectedProcedure
    .input(organizationInput)
    .query(({ ctx, input }) =>
      getLandingDraft({ ...input, db: ctx.db, actorUserId: ctx.actorUserId }),
    ),
  status: protectedProcedure
    .input(organizationInput)
    .query(({ ctx, input }) =>
      getLandingStatus({ ...input, db: ctx.db, actorUserId: ctx.actorUserId }),
    ),
  revisions: protectedProcedure
    .input(organizationInput)
    .query(({ ctx, input }) =>
      listLandingRevisions({
        ...input,
        limit: 50,
        db: ctx.db,
        actorUserId: ctx.actorUserId,
      }),
    ),
  updateCopy: protectedProcedure
    .input(
      organizationInput.extend({
        baseRevisionId: revisionId,
        copy: z
          .record(
            z.string().min(1).max(120),
            z.string().max(MAX_LANDING_FIELD_LENGTH),
          )
          .refine((copy) => Object.keys(copy).length > 0, "Nothing to save"),
      }),
    )
    .mutation(({ ctx, input }) =>
      updateLandingCopy({ ...input, db: ctx.db, actorUserId: ctx.actorUserId }),
    ),
  restoreRevision: protectedProcedure
    .input(organizationInput.extend({ revisionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await restoreLandingRevision({
        ...input,
        db: ctx.db,
        actorUserId: ctx.actorUserId,
      });
      if (!result.ok)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This revision no longer passes validation:\n${result.errors
            .map((issue) => issue.message)
            .join("\n")}`,
        });
      return result;
    }),
  publish: protectedProcedure
    .input(organizationInput.extend({ revisionId }))
    .mutation(({ ctx, input }) =>
      publishLandingPage({
        ...input,
        db: ctx.db,
        actorUserId: ctx.actorUserId,
      }),
    ),
  unpublish: protectedProcedure
    .input(organizationInput)
    .mutation(({ ctx, input }) =>
      unpublishLandingPage({
        ...input,
        db: ctx.db,
        actorUserId: ctx.actorUserId,
      }),
    ),
});
