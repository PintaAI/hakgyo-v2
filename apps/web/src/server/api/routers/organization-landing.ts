import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  organizationLandingConfigSchema,
  organizationPublicSlugSchema,
} from "~/lib/organization-landing";
import {
  getOrganizationLanding,
  getPublicOrganizationLanding,
  publishOrganizationLanding,
  saveOrganizationLandingDraft,
  unpublishOrganizationLanding,
} from "~/server/organization-landing/service";

const organizationInput = z.object({ organizationId: z.string().min(1) });
export const organizationLandingRouter = createTRPCRouter({
  get: protectedProcedure
    .input(organizationInput)
    .query(({ ctx, input }) =>
      getOrganizationLanding({
        ...input,
        db: ctx.db,
        actorUserId: ctx.actorUserId,
      }),
    ),
  saveDraft: protectedProcedure
    .input(
      organizationInput.extend({ config: organizationLandingConfigSchema }),
    )
    .mutation(({ ctx, input }) =>
      saveOrganizationLandingDraft({
        ...input,
        db: ctx.db,
        actorUserId: ctx.actorUserId,
      }),
    ),
  publish: protectedProcedure
    .input(organizationInput)
    .mutation(({ ctx, input }) =>
      publishOrganizationLanding({
        ...input,
        db: ctx.db,
        actorUserId: ctx.actorUserId,
      }),
    ),
  unpublish: protectedProcedure
    .input(organizationInput)
    .mutation(({ ctx, input }) =>
      unpublishOrganizationLanding({
        ...input,
        db: ctx.db,
        actorUserId: ctx.actorUserId,
      }),
    ),
  getPublic: publicProcedure
    .input(z.object({ slug: organizationPublicSlugSchema }))
    .query(({ ctx, input }) =>
      getPublicOrganizationLanding({ ...input, db: ctx.db }),
    ),
});
