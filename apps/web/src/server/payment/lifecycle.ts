import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import type { PaymentStatus } from "../../../generated/prisma/enums";
import {
  canTransitionPayment,
  openPaymentStatuses,
} from "~/lib/payments/payment";

type Transaction = Prisma.TransactionClient;

/**
 * Serializes payment changes of one learner in one cohort, so a double
 * click cannot open two checkouts and an approval cannot race a cancel.
 */
export async function lockLearnerCohortPayments(
  tx: Transaction,
  cohortId: string,
  userId: string,
) {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${`cohort-payment:${cohortId}:${userId}`}, 0))
  `;
}

const referenceAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short unambiguous code learners quote in the transfer note. */
export function createPaymentReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(
    bytes,
    (byte) => referenceAlphabet[byte % referenceAlphabet.length],
  ).join("");
  return `HKG-${code}`;
}

/** Loads the payment, takes its learner lock and re-reads the status. */
export async function lockPayment(tx: Transaction, paymentId: string) {
  const target = await tx.payment.findUnique({
    where: { id: paymentId },
    select: { cohortId: true, userId: true },
  });
  if (!target) throw new TRPCError({ code: "NOT_FOUND" });
  await lockLearnerCohortPayments(tx, target.cohortId, target.userId);
  return tx.payment.findUniqueOrThrow({
    where: { id: paymentId },
    select: {
      id: true,
      reference: true,
      cohortId: true,
      userId: true,
      status: true,
      proofKey: true,
    },
  });
}

function assertTransition(from: PaymentStatus, to: PaymentStatus) {
  if (!canTransitionPayment(from, to)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Status pembayaran sudah berubah. Muat ulang halaman.",
    });
  }
}

/**
 * Settles a payment and grants the seat: the learner becomes an ACTIVE
 * member with source PURCHASE unless they already have access, and their
 * other open checkouts for the cohort are cancelled. Staff approval and
 * gateway webhooks both end here.
 */
export async function markPaymentPaid(
  tx: Transaction,
  input: {
    paymentId: string;
    now: Date;
    reviewerUserId?: string | null;
    note?: string | null;
    providerData?: Prisma.InputJsonValue;
  },
) {
  const payment = await lockPayment(tx, input.paymentId);
  assertTransition(payment.status, "PAID");

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "PAID",
      paidAt: input.now,
      reviewedByUserId: input.reviewerUserId ?? null,
      reviewedAt: input.reviewerUserId ? input.now : null,
      reviewNote: input.note ?? null,
      ...(input.providerData === undefined
        ? {}
        : { providerData: input.providerData }),
    },
  });

  const membershipKey = {
    cohortId_userId: { cohortId: payment.cohortId, userId: payment.userId },
  };
  const existing = await tx.cohortEnrollment.findUnique({
    where: membershipKey,
    select: { status: true, expiresAt: true },
  });
  const hasAccess =
    (existing?.status === "ACTIVE" || existing?.status === "COMPLETED") &&
    (existing.expiresAt === null || existing.expiresAt > input.now);
  if (!hasAccess) {
    const joined = {
      status: "ACTIVE",
      source: "PURCHASE",
      completedAt: null,
      expiresAt: null,
    } as const;
    await tx.cohortEnrollment.upsert({
      where: membershipKey,
      create: { cohortId: payment.cohortId, userId: payment.userId, ...joined },
      update: { ...joined, enrolledAt: input.now },
    });
  }

  await tx.payment.updateMany({
    where: {
      cohortId: payment.cohortId,
      userId: payment.userId,
      id: { not: payment.id },
      status: { in: [...openPaymentStatuses] },
    },
    data: {
      status: "CANCELLED",
      reviewNote: `Digantikan oleh pembayaran ${payment.reference}`,
    },
  });

  return { ...payment, activated: !hasAccess };
}

/**
 * Rejects a payment. Rejecting an approved payment revokes the seat it
 * granted, unless another approved payment still covers the learner.
 */
export async function rejectPayment(
  tx: Transaction,
  input: {
    paymentId: string;
    reviewerUserId: string;
    reason: string;
    now: Date;
  },
) {
  const payment = await lockPayment(tx, input.paymentId);
  assertTransition(payment.status, "REJECTED");

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "REJECTED",
      paidAt: null,
      reviewedByUserId: input.reviewerUserId,
      reviewedAt: input.now,
      reviewNote: input.reason,
    },
  });

  let deactivated = false;
  if (payment.status === "PAID") {
    const stillPaid = await tx.payment.count({
      where: {
        cohortId: payment.cohortId,
        userId: payment.userId,
        status: "PAID",
      },
    });
    if (stillPaid === 0) {
      const revoked = await tx.cohortEnrollment.updateMany({
        where: {
          cohortId: payment.cohortId,
          userId: payment.userId,
          source: "PURCHASE",
          status: { in: ["ACTIVE", "COMPLETED"] },
        },
        data: { status: "CANCELLED" },
      });
      deactivated = revoked.count > 0;
    }
  }
  return { ...payment, deactivated };
}

export async function cancelPayment(
  tx: Transaction,
  input: {
    paymentId: string;
    now: Date;
    /** The learner who owns the payment; staff pass reviewerUserId instead. */
    learnerUserId?: string;
    reviewerUserId?: string;
    reason?: string | null;
  },
) {
  const payment = await lockPayment(tx, input.paymentId);
  if (input.learnerUserId && payment.userId !== input.learnerUserId) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  assertTransition(payment.status, "CANCELLED");
  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "CANCELLED",
      reviewedByUserId: input.reviewerUserId ?? null,
      reviewedAt: input.reviewerUserId ? input.now : null,
      reviewNote: input.reason ?? null,
    },
  });
  return payment;
}

/**
 * The learner reports a payment with a proof image. A rejected payment can
 * be resubmitted with a new proof while no other checkout is open.
 */
export async function submitPaymentProof(
  tx: Transaction,
  input: {
    paymentId: string;
    userId: string;
    proofKey: string;
    payerName: string | null;
    payerNote: string | null;
    now: Date;
  },
) {
  const payment = await lockPayment(tx, input.paymentId);
  if (payment.userId !== input.userId) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  assertTransition(payment.status, "SUBMITTED");
  if (payment.status === "REJECTED") {
    const otherOpen = await tx.payment.count({
      where: {
        cohortId: payment.cohortId,
        userId: payment.userId,
        id: { not: payment.id },
        status: { in: [...openPaymentStatuses] },
      },
    });
    if (otherOpen > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Kamu sudah punya pembayaran lain yang sedang berjalan.",
      });
    }
  }

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUBMITTED",
      proofKey: input.proofKey,
      payerName: input.payerName,
      payerNote: input.payerNote,
      submittedAt: input.now,
      reviewedByUserId: null,
      reviewedAt: null,
      reviewNote: null,
    },
  });
  return {
    ...payment,
    previousProofKey:
      payment.proofKey && payment.proofKey !== input.proofKey
        ? payment.proofKey
        : null,
  };
}
