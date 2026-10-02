import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma } from "../../../../generated/prisma/client";
import {
  createPaymentProofKey,
  MAX_PAYMENT_PROOF_SIZE,
  parsePaymentProofKey,
  paymentInstructionsSchema,
  paymentProofContentTypes,
} from "~/lib/payments/payment";
import { pageArgs, pageInput, pageResult } from "~/server/api/pagination";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { userSearchWhere } from "~/server/api/user-search";
import {
  requireCohortPermission,
  requireOrganizationPermission,
} from "~/server/authorization";
import { withTransactionRetry } from "~/server/db-retry";
import {
  notifyEnrollmentRemoved,
  notifyInBackground,
  notifyPaymentApproved,
  notifyPaymentRejected,
  notifyPaymentSubmitted,
} from "~/server/notifications/triggers";
import {
  loadCohortCheckout,
  startCohortCheckout,
} from "~/server/payment/checkout";
import { effectiveCohortPrice } from "~/server/payment/cohort-offer";
import {
  cancelPayment,
  markPaymentPaid,
  rejectPayment,
  submitPaymentProof,
} from "~/server/payment/lifecycle";
import {
  availablePaymentMethods,
  createOrganizationBankAccount,
  getCheckoutDestinations,
  getPaymentSettings,
  saveOrganizationQris,
  updateOrganizationBankAccount,
} from "~/server/payment/settings";
import {
  createUploadUrl,
  removeObject,
  signDownloadUrl,
  validateImageObject,
} from "~/server/storage/objects";

const id = z.string().min(1);
const paymentStatus = z.enum([
  "PENDING",
  "SUBMITTED",
  "PAID",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
]);
const paymentMethod = z.enum(["QRIS", "BANK_TRANSFER"]);
const inviteToken = z.string().min(20).max(200).optional();
const bankCode = z.string().trim().min(3).max(10);
// Bank account numbers are digits; spaces and dashes from copy-paste are dropped.
const accountNumber = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^\d{5,30}$/, "Nomor rekening hanya berisi angka"));
const accountHolder = z.string().trim().min(2).max(120);
/** Optional free text; blank input is treated as absent. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

function requirePaymentSettingsManager(organizationId: string, userId: string) {
  return requireOrganizationPermission({
    organizationId,
    permission: "organization.manage",
    userId,
  });
}

/** Loads the payment and checks the caller verifies payments for its cohort. */
async function requirePaymentManager(
  database: Pick<Prisma.TransactionClient, "payment">,
  paymentId: string,
  userId: string,
) {
  const payment = await database.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, cohortId: true, userId: true },
  });
  if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
  await requireCohortPermission({
    cohortId: payment.cohortId,
    permission: "payments.manage",
    userId,
  });
  return payment;
}

const learnerPaymentSelect = {
  id: true,
  reference: true,
  amount: true,
  currency: true,
  method: true,
  provider: true,
  status: true,
  instructions: true,
  proofKey: true,
  payerName: true,
  payerNote: true,
  submittedAt: true,
  reviewedAt: true,
  reviewNote: true,
  paidAt: true,
  expiresAt: true,
  createdAt: true,
  cohort: {
    select: {
      id: true,
      name: true,
      startsAt: true,
      endsAt: true,
      course: { select: { id: true, title: true, thumbnailUrl: true } },
    },
  },
  organization: { select: { name: true } },
} as const;

export const paymentRouter = createTRPCRouter({
  // Organization payment settings (owners and admins).

  getSettings: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      await requirePaymentSettingsManager(
        input.organizationId,
        ctx.actorUserId,
      );
      return getPaymentSettings(ctx.db, input.organizationId);
    }),

  saveQris: protectedProcedure
    .input(
      z.object({ organizationId: id, payload: z.string().min(20).max(1024) }),
    )
    .mutation(async ({ ctx, input }) => {
      await requirePaymentSettingsManager(
        input.organizationId,
        ctx.actorUserId,
      );
      return saveOrganizationQris(ctx.db, input);
    }),

  setQrisEnabled: protectedProcedure
    .input(z.object({ organizationId: id, enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await requirePaymentSettingsManager(
        input.organizationId,
        ctx.actorUserId,
      );
      const updated = await ctx.db.organizationQris.updateMany({
        where: { organizationId: input.organizationId },
        data: { enabled: input.enabled },
      });
      if (updated.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { enabled: input.enabled };
    }),

  removeQris: protectedProcedure
    .input(z.object({ organizationId: id }))
    .mutation(async ({ ctx, input }) => {
      await requirePaymentSettingsManager(
        input.organizationId,
        ctx.actorUserId,
      );
      await ctx.db.organizationQris.deleteMany({
        where: { organizationId: input.organizationId },
      });
      return { removed: true };
    }),

  createBankAccount: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        bankCode,
        bankName: z.string().trim().max(120).nullable().optional(),
        accountNumber,
        accountHolder,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requirePaymentSettingsManager(
        input.organizationId,
        ctx.actorUserId,
      );
      return createOrganizationBankAccount(ctx.db, input);
    }),

  updateBankAccount: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        bankAccountId: id,
        bankCode: bankCode.optional(),
        bankName: z.string().trim().max(120).nullable().optional(),
        accountNumber: accountNumber.optional(),
        accountHolder: accountHolder.optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requirePaymentSettingsManager(
        input.organizationId,
        ctx.actorUserId,
      );
      return updateOrganizationBankAccount(ctx.db, input);
    }),

  deleteBankAccount: protectedProcedure
    .input(z.object({ organizationId: id, bankAccountId: id }))
    .mutation(async ({ ctx, input }) => {
      await requirePaymentSettingsManager(
        input.organizationId,
        ctx.actorUserId,
      );
      const deleted = await ctx.db.organizationBankAccount.deleteMany({
        where: {
          id: input.bankAccountId,
          organizationId: input.organizationId,
        },
      });
      if (deleted.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { deleted: true };
    }),

  // Learner checkout.

  getCohortCheckout: protectedProcedure
    .input(z.object({ cohortId: id, inviteToken }))
    .query(async ({ ctx, input }) => {
      return loadCohortCheckout(ctx.db, {
        cohortId: input.cohortId,
        userId: ctx.actorUserId,
        inviteToken: input.inviteToken,
        now: new Date(),
      });
    }),

  startCohortCheckout: protectedProcedure
    .input(
      z.object({
        cohortId: id,
        method: paymentMethod.optional(),
        inviteToken,
      }),
    )
    .mutation(({ ctx, input }) =>
      withTransactionRetry(() =>
        ctx.db.$transaction((tx) =>
          startCohortCheckout(tx, {
            cohortId: input.cohortId,
            userId: ctx.actorUserId,
            method: input.method,
            inviteToken: input.inviteToken,
            now: new Date(),
          }),
        ),
      ),
    ),

  listMine: protectedProcedure
    .input(pageInput)
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.payment.findMany({
        where: { userId: ctx.actorUserId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...pageArgs(input),
        select: {
          id: true,
          reference: true,
          amount: true,
          method: true,
          status: true,
          createdAt: true,
          cohort: {
            select: { name: true, course: { select: { title: true } } },
          },
        },
      });
      return pageResult(items, input.limit);
    }),

  get: protectedProcedure
    .input(z.object({ paymentId: id }))
    .query(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findFirst({
        where: { id: input.paymentId, userId: ctx.actorUserId },
        select: learnerPaymentSelect,
      });
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
      const { proofKey, instructions, ...rest } = payment;
      return {
        ...rest,
        instructions: paymentInstructionsSchema.parse(instructions),
        hasProof: proofKey !== null,
      };
    }),

  cancel: protectedProcedure
    .input(z.object({ paymentId: id }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction((tx) =>
        cancelPayment(tx, {
          paymentId: input.paymentId,
          learnerUserId: ctx.actorUserId,
          now: new Date(),
        }),
      );
      return { cancelled: true };
    }),

  createProofUpload: protectedProcedure
    .input(
      z.object({
        paymentId: id,
        contentType: z.enum(paymentProofContentTypes),
        fileSize: z.number().int().positive().max(MAX_PAYMENT_PROOF_SIZE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findFirst({
        where: {
          id: input.paymentId,
          userId: ctx.actorUserId,
          status: { in: ["PENDING", "SUBMITTED", "REJECTED"] },
        },
        select: { id: true },
      });
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
      return createUploadUrl(
        createPaymentProofKey(payment.id, input.fileSize, input.contentType),
        input.contentType,
      );
    }),

  submitProof: protectedProcedure
    .input(
      z.object({
        paymentId: id,
        key: z.string().min(1).max(1024),
        payerName: optionalText(120),
        payerNote: optionalText(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const parsed = parsePaymentProofKey(input.key, input.paymentId);
      if (!parsed) throw new TRPCError({ code: "BAD_REQUEST" });
      const owned = await ctx.db.payment.findFirst({
        where: { id: input.paymentId, userId: ctx.actorUserId },
        select: { id: true },
      });
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" });
      await validateImageObject(input.key, parsed, "payment proof");

      const result = await ctx.db
        .$transaction((tx) =>
          submitPaymentProof(tx, {
            paymentId: input.paymentId,
            userId: ctx.actorUserId,
            proofKey: input.key,
            payerName: input.payerName ?? null,
            payerNote: input.payerNote ?? null,
            now: new Date(),
          }),
        )
        .catch(async (error: unknown) => {
          // The payment moved on (approved, cancelled); drop the new upload.
          await removeObject(input.key, "unused payment proof");
          throw error;
        });
      if (result.previousProofKey) {
        await removeObject(result.previousProofKey, "replaced payment proof");
      }
      await notifyInBackground("payment submitted", () =>
        notifyPaymentSubmitted(input.paymentId),
      );
      return { submitted: true };
    }),

  /** Signed link to the proof, for its learner or the cohort's verifiers. */
  getProofUrl: protectedProcedure
    .input(z.object({ paymentId: id }))
    .query(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findUnique({
        where: { id: input.paymentId },
        select: { userId: true, proofKey: true },
      });
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
      if (payment.userId !== ctx.actorUserId) {
        await requirePaymentManager(ctx.db, input.paymentId, ctx.actorUserId);
      }
      if (!payment.proofKey) throw new TRPCError({ code: "NOT_FOUND" });
      return { url: await signDownloadUrl(payment.proofKey, "inline") };
    }),

  // Staff verification.

  listForCohort: protectedProcedure
    .input(
      pageInput.extend({
        cohortId: id,
        status: paymentStatus.optional(),
        search: z.string().trim().max(200).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const cohort = await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "payments.manage",
        userId: ctx.actorUserId,
      });
      const where = {
        cohortId: input.cohortId,
        status: input.status,
        ...(input.search
          ? {
              OR: [
                {
                  reference: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
                { user: { is: userSearchWhere(input.search) } },
              ],
            }
          : {}),
      };
      const [items, statusCounts, offer, destinations] = await Promise.all([
        ctx.db.payment.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          ...pageArgs(input),
          select: {
            id: true,
            reference: true,
            amount: true,
            method: true,
            provider: true,
            status: true,
            proofKey: true,
            payerName: true,
            payerNote: true,
            submittedAt: true,
            reviewedAt: true,
            reviewNote: true,
            paidAt: true,
            createdAt: true,
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
            reviewedBy: { select: { name: true } },
          },
        }),
        ctx.db.payment.groupBy({
          by: ["status"],
          where: { cohortId: input.cohortId },
          _count: { _all: true },
        }),
        ctx.db.cohort.findUniqueOrThrow({
          where: { id: input.cohortId },
          select: { price: true, course: { select: { price: true } } },
        }),
        getCheckoutDestinations(ctx.db, cohort.organizationId),
      ]);
      const counts = Object.fromEntries(
        statusCounts.map((group) => [group.status, group._count._all]),
      ) as Partial<Record<z.infer<typeof paymentStatus>, number>>;
      return {
        ...pageResult(
          items.map(({ proofKey, ...item }) => ({
            ...item,
            hasProof: proofKey !== null,
          })),
          input.limit,
        ),
        counts,
        price: effectiveCohortPrice(offer, offer.course),
        methods: availablePaymentMethods(destinations),
      };
    }),

  approve: protectedProcedure
    .input(
      z.object({
        paymentId: id,
        note: optionalText(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requirePaymentManager(ctx.db, input.paymentId, ctx.actorUserId);
      const result = await withTransactionRetry(() =>
        ctx.db.$transaction((tx) =>
          markPaymentPaid(tx, {
            paymentId: input.paymentId,
            reviewerUserId: ctx.actorUserId,
            note: input.note ?? null,
            now: new Date(),
          }),
        ),
      );
      await notifyInBackground("payment approved", () =>
        notifyPaymentApproved(input.paymentId),
      );
      return { approved: true, activated: result.activated };
    }),

  reject: protectedProcedure
    .input(
      z.object({
        paymentId: id,
        reason: z.string().trim().min(3).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requirePaymentManager(ctx.db, input.paymentId, ctx.actorUserId);
      const result = await withTransactionRetry(() =>
        ctx.db.$transaction((tx) =>
          rejectPayment(tx, {
            paymentId: input.paymentId,
            reviewerUserId: ctx.actorUserId,
            reason: input.reason,
            now: new Date(),
          }),
        ),
      );
      await notifyInBackground("payment rejected", () =>
        notifyPaymentRejected(input.paymentId),
      );
      if (result.deactivated) {
        await notifyInBackground("enrollment removed", () =>
          notifyEnrollmentRemoved(result.userId, result.cohortId),
        );
      }
      return { rejected: true, deactivated: result.deactivated };
    }),

  cancelForCohort: protectedProcedure
    .input(
      z.object({
        paymentId: id,
        reason: optionalText(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requirePaymentManager(ctx.db, input.paymentId, ctx.actorUserId);
      await ctx.db.$transaction((tx) =>
        cancelPayment(tx, {
          paymentId: input.paymentId,
          reviewerUserId: ctx.actorUserId,
          reason: input.reason ?? null,
          now: new Date(),
        }),
      );
      return { cancelled: true };
    }),
});
