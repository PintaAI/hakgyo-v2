import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import type { PaymentMethod } from "../../../generated/prisma/enums";
import { openPaymentStatuses } from "~/lib/payments/payment";
import {
  findOtherRunningClass,
  otherRunningClassMessage,
} from "~/server/enrollment/cohort-access";
import {
  consumeEnrollmentInvite,
  redeemEnrollmentInvite,
} from "~/server/enrollment/invite-redemption";
import {
  cohortJoinBlockerMessages,
  effectiveCohortEnrollmentMode,
  effectiveCohortPrice,
  getCohortJoinBlocker,
  isCohortJoinable,
} from "~/server/payment/cohort-offer";
import {
  createPaymentReference,
  lockLearnerCohortPayments,
} from "~/server/payment/lifecycle";
import { paymentProviderFor } from "~/server/payment/providers";
import {
  availablePaymentMethods,
  getCheckoutDestinations,
} from "~/server/payment/settings";

type Database = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

/** Whether `token` is a usable invite to this cohort. */
async function hasValidCohortInvite(
  db: Database,
  input: { cohortId: string; token?: string | null; now: Date },
) {
  if (!input.token) return false;
  const invite = await db.enrollmentInvite.findUnique({
    where: { token: input.token },
    select: {
      cohortId: true,
      revokedAt: true,
      expiresAt: true,
      maxUses: true,
      useCount: true,
    },
  });
  return (
    invite !== null &&
    invite.cohortId === input.cohortId &&
    invite.revokedAt === null &&
    (invite.expiresAt === null || invite.expiresAt > input.now) &&
    (invite.maxUses === null || invite.useCount < invite.maxUses)
  );
}

/**
 * What a learner sees before joining a class cohort: the offer, the payment
 * methods, any open checkout to resume, and why they cannot join if so.
 */
export async function loadCohortCheckout(
  db: Database,
  input: {
    cohortId: string;
    userId: string;
    inviteToken?: string | null;
    now: Date;
  },
) {
  const cohort = await db.cohort.findUnique({
    where: { id: input.cohortId },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      price: true,
      enrollmentMode: true,
      defaultForCourseId: true,
      organizationId: true,
      course: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          status: true,
          price: true,
          enrollmentMode: true,
          organization: {
            select: { name: true, defaultEnrollmentMode: true },
          },
        },
      },
    },
  });
  // Drafts are not announced to learners yet.
  if (!cohort || cohort.defaultForCourseId || cohort.status === "DRAFT") {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  const [
    memberCount,
    membership,
    otherClass,
    openPayment,
    destinations,
    hasValidInvite,
  ] = await Promise.all([
    db.cohortEnrollment.count({
      where: {
        cohortId: cohort.id,
        status: { in: ["ACTIVE", "COMPLETED"] },
      },
    }),
    db.cohortEnrollment.findUnique({
      where: {
        cohortId_userId: { cohortId: cohort.id, userId: input.userId },
      },
      select: { status: true, expiresAt: true },
    }),
    findOtherRunningClass(db, {
      cohortId: cohort.id,
      courseId: cohort.course.id,
      userId: input.userId,
      now: input.now,
    }),
    db.payment.findFirst({
      where: {
        cohortId: cohort.id,
        userId: input.userId,
        status: { in: [...openPaymentStatuses] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
    getCheckoutDestinations(db, cohort.organizationId),
    hasValidCohortInvite(db, {
      cohortId: cohort.id,
      token: input.inviteToken,
      now: input.now,
    }),
  ]);

  const price = effectiveCohortPrice(cohort, cohort.course);
  const methods = availablePaymentMethods(destinations);
  const enrollmentMode = effectiveCohortEnrollmentMode(
    cohort,
    cohort.course,
    cohort.course.organization,
  );
  const alreadyEnrolled =
    (membership?.status === "ACTIVE" || membership?.status === "COMPLETED") &&
    (membership.expiresAt === null || membership.expiresAt > input.now);
  const blocker = getCohortJoinBlocker({
    joinable: isCohortJoinable(cohort, input.now),
    coursePublished: cohort.course.status === "PUBLISHED",
    enrollmentMode,
    hasValidInvite,
    alreadyEnrolled,
    inOtherClass: otherClass !== null,
    capacity: cohort.capacity,
    memberCount,
    price,
    hasPaymentMethod: methods.length > 0,
  });

  return {
    cohort: {
      id: cohort.id,
      name: cohort.name,
      description: cohort.description,
      startsAt: cohort.startsAt,
      endsAt: cohort.endsAt,
      capacity: cohort.capacity,
      seatsLeft:
        cohort.capacity === null
          ? null
          : Math.max(cohort.capacity - memberCount, 0),
    },
    course: {
      id: cohort.course.id,
      title: cohort.course.title,
      thumbnailUrl: cohort.course.thumbnailUrl,
    },
    organizationName: cohort.course.organization.name,
    organizationId: cohort.organizationId,
    price,
    currency: "IDR" as const,
    methods,
    enrollmentMode,
    usesInvite: enrollmentMode !== "OPEN" && hasValidInvite,
    openPaymentId: openPayment?.id ?? null,
    blocker,
    blockerMessage:
      blocker === "IN_OTHER_CLASS" && otherClass
        ? otherRunningClassMessage(otherClass.name)
        : blocker
          ? cohortJoinBlockerMessages[blocker]
          : null,
  };
}

/**
 * Starts joining a class cohort. Free cohorts enroll right away; paid ones
 * create a payment through the method's provider and return it. An open
 * checkout is resumed instead of creating a second one.
 */
export async function startCohortCheckout(
  tx: Prisma.TransactionClient,
  input: {
    cohortId: string;
    userId: string;
    method?: PaymentMethod;
    inviteToken?: string | null;
    now: Date;
  },
) {
  await lockLearnerCohortPayments(tx, input.cohortId, input.userId);
  const checkout = await loadCohortCheckout(tx, input);
  const courseId = checkout.course.id;

  if (checkout.openPaymentId) {
    return { type: "PAYMENT" as const, paymentId: checkout.openPaymentId };
  }
  if (checkout.blocker === "ALREADY_ENROLLED") {
    return { type: "ENROLLED" as const, courseId };
  }
  if (checkout.blocker) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: checkout.blockerMessage ?? undefined,
    });
  }

  if (checkout.price === 0) {
    if (checkout.usesInvite && input.inviteToken) {
      await redeemEnrollmentInvite(tx, {
        token: input.inviteToken,
        userId: input.userId,
        now: input.now,
      });
    } else {
      const joined = {
        status: "ACTIVE",
        source: "OPEN",
        completedAt: null,
        expiresAt: null,
      } as const;
      await tx.cohortEnrollment.upsert({
        where: {
          cohortId_userId: { cohortId: input.cohortId, userId: input.userId },
        },
        create: { cohortId: input.cohortId, userId: input.userId, ...joined },
        update: joined,
      });
    }
    return { type: "ENROLLED" as const, courseId };
  }

  if (!input.method || !checkout.methods.some((m) => m === input.method)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pilih metode pembayaran yang tersedia.",
    });
  }

  // The invite opened checkout, so it is spent once a payment exists.
  const invite =
    checkout.usesInvite && input.inviteToken
      ? await consumeEnrollmentInvite(tx, input.inviteToken, input.now)
      : null;
  const reference = createPaymentReference();
  const provider = paymentProviderFor(input.method);
  const charge = await provider.createCharge({
    reference,
    amount: checkout.price,
    method: input.method,
    destinations: await getCheckoutDestinations(tx, checkout.organizationId),
  });
  const payment = await tx.payment.create({
    data: {
      reference,
      organizationId: checkout.organizationId,
      cohortId: input.cohortId,
      userId: input.userId,
      enrollmentInviteId: invite?.id ?? null,
      amount: checkout.price,
      currency: checkout.currency,
      method: input.method,
      provider: provider.provider,
      instructions: charge.instructions,
      providerPaymentId: charge.providerPaymentId ?? null,
      providerData: charge.providerData as Prisma.InputJsonValue | undefined,
      expiresAt: charge.expiresAt ?? null,
    },
    select: { id: true },
  });
  return { type: "PAYMENT" as const, paymentId: payment.id };
}

/**
 * Class cohorts of a published course that anyone can join, for the public
 * catalog. Invite-only cohorts are not advertised.
 */
export async function listPublicCohorts(
  db: Database,
  course: {
    id: string;
    price: number;
    enrollmentMode: "OPEN" | "INVITE_ONLY" | null;
    organization: { defaultEnrollmentMode: "OPEN" | "INVITE_ONLY" };
  },
  now: Date,
) {
  const cohorts = await db.cohort.findMany({
    where: {
      courseId: course.id,
      defaultForCourseId: null,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: [
      { startsAt: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      price: true,
      enrollmentMode: true,
    },
  });
  const open = cohorts.filter(
    (cohort) =>
      effectiveCohortEnrollmentMode(cohort, course, course.organization) ===
      "OPEN",
  );
  if (open.length === 0) return [];

  const memberCounts = await db.cohortEnrollment.groupBy({
    by: ["cohortId"],
    where: {
      cohortId: { in: open.map(({ id }) => id) },
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
    _count: { _all: true },
  });
  const countFor = (cohortId: string) =>
    memberCounts.find((group) => group.cohortId === cohortId)?._count._all ?? 0;

  return open.map(({ enrollmentMode: _mode, price, ...cohort }) => ({
    ...cohort,
    price: effectiveCohortPrice({ price }, course),
    seatsLeft:
      cohort.capacity === null
        ? null
        : Math.max(cohort.capacity - countFor(cohort.id), 0),
  }));
}
