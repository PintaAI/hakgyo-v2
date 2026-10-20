import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  requireCohortPermission,
  requireOrganizationPermission,
} from "~/server/authorization";
import {
  getCohortWhatsappStatus,
  requestCohortGroup,
  unlinkCohortGroup,
} from "~/server/whatsapp/cohort";
import {
  disconnectWhatsapp,
  getWhatsappConnection,
  getWhatsappPairing,
  startWhatsappConnection,
  updateWhatsappSettings,
} from "~/server/whatsapp/connection";

const id = z.string().min(1);
const organizationInput = z.object({ organizationId: id });

/** WhatsApp groups for cohorts through Evolution API (docs/whatsapp.md). */
export const whatsappRouter = createTRPCRouter({
  getConnection: protectedProcedure
    .input(organizationInput)
    .query(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        ...input,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      return getWhatsappConnection(input.organizationId);
    }),
  connect: protectedProcedure
    .input(organizationInput)
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrganizationPermission({
        ...input,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      return startWhatsappConnection({
        organizationId: input.organizationId,
        membershipId: membership.id,
      });
    }),
  /** Polled only while the QR dialog is open: the scan happens on a phone. */
  getPairing: protectedProcedure
    .input(organizationInput)
    .query(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        ...input,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      return getWhatsappPairing(input.organizationId);
    }),
  disconnect: protectedProcedure
    .input(organizationInput)
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        ...input,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      await disconnectWhatsapp(input.organizationId);
      return { disconnected: true };
    }),
  updateSettings: protectedProcedure
    .input(
      organizationInput.extend({
        autoCreateGroups: z.boolean().optional(),
        initialParticipantPhone: z.string().max(32).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      await updateWhatsappSettings(input);
      return getWhatsappConnection(input.organizationId);
    }),
  getCohortStatus: protectedProcedure
    .input(z.object({ cohortId: id }))
    .query(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "update",
        userId: ctx.actorUserId,
      });
      return getCohortWhatsappStatus(input.cohortId);
    }),
  createCohortGroup: protectedProcedure
    .input(
      z.object({
        cohortId: id,
        participantPhone: z.string().max(32).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "update",
        userId: ctx.actorUserId,
      });
      return requestCohortGroup({
        cohortId: input.cohortId,
        participant: input.participantPhone,
      });
    }),
  unlinkCohortGroup: protectedProcedure
    .input(z.object({ cohortId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "update",
        userId: ctx.actorUserId,
      });
      await unlinkCohortGroup(input.cohortId);
      return { unlinked: true };
    }),
});
