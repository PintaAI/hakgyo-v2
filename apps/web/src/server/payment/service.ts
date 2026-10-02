import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import {
  createPaymentProofKey,
  paymentInstructionsSchema,
  type PaymentProofContentType,
} from "~/lib/payments/payment";
import { pageArgs, pageResult } from "~/server/api/pagination";
import { userSearchWhere } from "~/server/api/user-search";
import { requireCohortPermission } from "~/server/authorization";
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
} from "~/server/payment/lifecycle";
import {
  availablePaymentMethods,
  getCheckoutDestinations,
} from "~/server/payment/settings";
import {
  createUploadUrl,
  removeObject,
  signDownloadUrl,
  validateImageObject,
} from "~/server/storage/objects";

import type {
  PaymentStatus,
  PaymentMethod,
} from "../../../generated/prisma/enums";
import { submitPaymentProofUpload } from "./proofs";

type Database = Prisma.DefaultPrismaClient;
type PageInput = { limit: number; cursor?: string; includeTotal: boolean };

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

export async function getLearnerCohortCheckout(
  db: Database,
  userId: string,
  input: { cohortId: string; inviteToken?: string },
) {
  return loadCohortCheckout(db, {
    cohortId: input.cohortId,
    userId,
    inviteToken: input.inviteToken,
    now: new Date(),
  });
}

export async function listLearnerPayments(
  db: Database,
  userId: string,
  input: PageInput,
) {
  const items = await db.payment.findMany({
    where: { userId },
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
}

export async function getLearnerPayment(
  db: Database,
  userId: string,
  input: { paymentId: string },
) {
  const payment = await db.payment.findFirst({
    where: { id: input.paymentId, userId },
    select: learnerPaymentSelect,
  });
  if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
  const { proofKey, instructions, ...rest } = payment;
  return {
    ...rest,
    instructions: paymentInstructionsSchema.parse(instructions),
    hasProof: proofKey !== null,
  };
}

export async function cancelLearnerPayment(
  db: Database,
  userId: string,
  input: { paymentId: string },
) {
  await db.$transaction((tx) =>
    cancelPayment(tx, {
      paymentId: input.paymentId,
      learnerUserId: userId,
      now: new Date(),
    }),
  );
  return { cancelled: true };
}

export async function createLearnerProofUpload(
  db: Database,
  userId: string,
  input: {
    paymentId: string;
    contentType: PaymentProofContentType;
    fileSize: number;
  },
) {
  const payment = await db.payment.findFirst({
    where: {
      id: input.paymentId,
      userId,
      status: { in: ["PENDING", "SUBMITTED", "REJECTED"] },
    },
    select: { id: true },
  });
  if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
  return createUploadUrl(
    createPaymentProofKey(payment.id, input.fileSize, input.contentType),
    input.contentType,
  );
}

export async function submitLearnerPaymentProof(
  db: Database,
  userId: string,
  input: {
    paymentId: string;
    key: string;
    payerName?: string;
    payerNote?: string;
  },
) {
  await submitPaymentProofUpload(
    db,
    {
      paymentId: input.paymentId,
      userId,
      proofKey: input.key,
      payerName: input.payerName ?? null,
      payerNote: input.payerNote ?? null,
      now: new Date(),
    },
    {
      validateImageObject: (key, expected, label) =>
        validateImageObject(key, expected, label, { removeOnFailure: false }),
      removeObject,
    },
  );
  await notifyInBackground("payment submitted", () =>
    notifyPaymentSubmitted(input.paymentId),
  );
  return { submitted: true };
}

export async function getPaymentProofUrl(
  db: Database,
  userId: string,
  input: { paymentId: string },
) {
  const payment = await db.payment.findUnique({
    where: { id: input.paymentId },
    select: { userId: true, proofKey: true },
  });
  if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
  if (payment.userId !== userId) {
    await requirePaymentManager(db, input.paymentId, userId);
  }
  if (!payment.proofKey) throw new TRPCError({ code: "NOT_FOUND" });
  return { url: await signDownloadUrl(payment.proofKey, "inline") };
}

export async function listCohortPayments(
  db: Database,
  userId: string,
  input: PageInput & {
    cohortId: string;
    status?: PaymentStatus;
    search?: string;
  },
) {
  const cohort = await requireCohortPermission({
    cohortId: input.cohortId,
    permission: "payments.manage",
    userId,
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
    db.payment.findMany({
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
    db.payment.groupBy({
      by: ["status"],
      where: { cohortId: input.cohortId },
      _count: { _all: true },
    }),
    db.cohort.findUniqueOrThrow({
      where: { id: input.cohortId },
      select: { price: true, course: { select: { price: true } } },
    }),
    getCheckoutDestinations(db, cohort.organizationId),
  ]);
  const counts = Object.fromEntries(
    statusCounts.map((group) => [group.status, group._count._all]),
  ) as Partial<Record<PaymentStatus, number>>;
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
}

export async function approveCohortPayment(
  db: Database,
  userId: string,
  input: { paymentId: string; note?: string },
) {
  await requirePaymentManager(db, input.paymentId, userId);
  const result = await withTransactionRetry(() =>
    db.$transaction((tx) =>
      markPaymentPaid(tx, {
        paymentId: input.paymentId,
        reviewerUserId: userId,
        note: input.note ?? null,
        now: new Date(),
      }),
    ),
  );
  await notifyInBackground("payment approved", () =>
    notifyPaymentApproved(input.paymentId),
  );
  return { approved: true, activated: result.activated };
}

export async function rejectCohortPayment(
  db: Database,
  userId: string,
  input: { paymentId: string; reason: string },
) {
  await requirePaymentManager(db, input.paymentId, userId);
  const result = await withTransactionRetry(() =>
    db.$transaction((tx) =>
      rejectPayment(tx, {
        paymentId: input.paymentId,
        reviewerUserId: userId,
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
}

export async function cancelCohortPayment(
  db: Database,
  userId: string,
  input: { paymentId: string; reason?: string },
) {
  await requirePaymentManager(db, input.paymentId, userId);
  await db.$transaction((tx) =>
    cancelPayment(tx, {
      paymentId: input.paymentId,
      reviewerUserId: userId,
      reason: input.reason ?? null,
      now: new Date(),
    }),
  );
  return { cancelled: true };
}

export function createLearnerCohortCheckout(
  db: Database,
  userId: string,
  input: { cohortId: string; method?: PaymentMethod; inviteToken?: string },
) {
  return withTransactionRetry(() =>
    db.$transaction((tx) =>
      startCohortCheckout(tx, { ...input, userId, now: new Date() }),
    ),
  );
}
