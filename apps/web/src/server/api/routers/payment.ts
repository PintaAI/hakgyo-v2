import { z } from "zod";
import {
  MAX_PAYMENT_PROOF_SIZE,
  paymentProofContentTypes,
} from "~/lib/payments/payment";
import { pageInput } from "~/server/api/pagination";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  getLearnerCohortCheckout,
  listLearnerPayments,
  getLearnerPayment,
  cancelLearnerPayment,
  createLearnerProofUpload,
  submitLearnerPaymentProof,
  getPaymentProofUrl,
  listCohortPayments,
  approveCohortPayment,
  rejectCohortPayment,
  cancelCohortPayment,
  createLearnerCohortCheckout,
} from "~/server/payment/service";
import {
  getPaymentSettings,
  saveOrganizationQris,
  setOrganizationQrisEnabled,
  removeOrganizationQris,
  createOrganizationBankAccount,
  updateOrganizationBankAccount,
  deleteOrganizationBankAccount,
} from "~/server/payment/settings";

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

export const paymentRouter = createTRPCRouter({
  // Organization payment settings (owners and admins).

  getSettings: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(({ ctx, input }) =>
      getPaymentSettings(ctx.db, input.organizationId, ctx.actorUserId),
    ),

  saveQris: protectedProcedure
    .input(
      z.object({ organizationId: id, payload: z.string().min(20).max(1024) }),
    )
    .mutation(({ ctx, input }) =>
      saveOrganizationQris(ctx.db, { ...input, userId: ctx.actorUserId }),
    ),

  setQrisEnabled: protectedProcedure
    .input(z.object({ organizationId: id, enabled: z.boolean() }))
    .mutation(({ ctx, input }) =>
      setOrganizationQrisEnabled(ctx.db, { ...input, userId: ctx.actorUserId }),
    ),

  removeQris: protectedProcedure
    .input(z.object({ organizationId: id }))
    .mutation(({ ctx, input }) =>
      removeOrganizationQris(ctx.db, { ...input, userId: ctx.actorUserId }),
    ),

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
    .mutation(({ ctx, input }) =>
      createOrganizationBankAccount(ctx.db, {
        ...input,
        userId: ctx.actorUserId,
      }),
    ),

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
    .mutation(({ ctx, input }) =>
      updateOrganizationBankAccount(ctx.db, {
        ...input,
        userId: ctx.actorUserId,
      }),
    ),

  deleteBankAccount: protectedProcedure
    .input(z.object({ organizationId: id, bankAccountId: id }))
    .mutation(({ ctx, input }) =>
      deleteOrganizationBankAccount(ctx.db, {
        ...input,
        userId: ctx.actorUserId,
      }),
    ),

  // Learner checkout.

  getCohortCheckout: protectedProcedure
    .input(z.object({ cohortId: id, inviteToken }))
    .query(({ ctx, input }) =>
      getLearnerCohortCheckout(ctx.db, ctx.actorUserId, input),
    ),

  startCohortCheckout: protectedProcedure
    .input(
      z.object({
        cohortId: id,
        method: paymentMethod.optional(),
        inviteToken,
      }),
    )
    .mutation(({ ctx, input }) =>
      createLearnerCohortCheckout(ctx.db, ctx.actorUserId, input),
    ),

  listMine: protectedProcedure
    .input(pageInput)
    .query(({ ctx, input }) =>
      listLearnerPayments(ctx.db, ctx.actorUserId, input),
    ),

  get: protectedProcedure
    .input(z.object({ paymentId: id }))
    .query(({ ctx, input }) =>
      getLearnerPayment(ctx.db, ctx.actorUserId, input),
    ),

  cancel: protectedProcedure
    .input(z.object({ paymentId: id }))
    .mutation(({ ctx, input }) =>
      cancelLearnerPayment(ctx.db, ctx.actorUserId, input),
    ),

  createProofUpload: protectedProcedure
    .input(
      z.object({
        paymentId: id,
        contentType: z.enum(paymentProofContentTypes),
        fileSize: z.number().int().positive().max(MAX_PAYMENT_PROOF_SIZE),
      }),
    )
    .mutation(({ ctx, input }) =>
      createLearnerProofUpload(ctx.db, ctx.actorUserId, input),
    ),

  submitProof: protectedProcedure
    .input(
      z.object({
        paymentId: id,
        key: z.string().min(1).max(1024),
        payerName: optionalText(120),
        payerNote: optionalText(1000),
      }),
    )
    .mutation(({ ctx, input }) =>
      submitLearnerPaymentProof(ctx.db, ctx.actorUserId, input),
    ),

  /** Signed link to the proof, for its learner or the cohort's verifiers. */
  getProofUrl: protectedProcedure
    .input(z.object({ paymentId: id }))
    .query(({ ctx, input }) =>
      getPaymentProofUrl(ctx.db, ctx.actorUserId, input),
    ),

  // Staff verification.

  listForCohort: protectedProcedure
    .input(
      pageInput.extend({
        cohortId: id,
        status: paymentStatus.optional(),
        search: z.string().trim().max(200).optional(),
      }),
    )
    .query(({ ctx, input }) =>
      listCohortPayments(ctx.db, ctx.actorUserId, input),
    ),

  approve: protectedProcedure
    .input(
      z.object({
        paymentId: id,
        note: optionalText(1000),
      }),
    )
    .mutation(({ ctx, input }) =>
      approveCohortPayment(ctx.db, ctx.actorUserId, input),
    ),

  reject: protectedProcedure
    .input(
      z.object({
        paymentId: id,
        reason: z.string().trim().min(3).max(1000),
      }),
    )
    .mutation(({ ctx, input }) =>
      rejectCohortPayment(ctx.db, ctx.actorUserId, input),
    ),

  cancelForCohort: protectedProcedure
    .input(
      z.object({
        paymentId: id,
        reason: optionalText(1000),
      }),
    )
    .mutation(({ ctx, input }) =>
      cancelCohortPayment(ctx.db, ctx.actorUserId, input),
    ),
});
