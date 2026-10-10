import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import {
  findOtherRunningClass,
  otherRunningClassMessage,
} from "~/server/enrollment/cohort-access";
import { upsertDefaultCohortEnrollment } from "~/server/enrollment/default-cohort";
import { effectiveCohortPrice } from "~/server/payment/cohort-offer";

export async function findRedeemableEnrollmentInvite(
  tx: Prisma.TransactionClient,
  token: string,
  now: Date,
) {
  const invite = await tx.enrollmentInvite.findUnique({
    where: { token },
    include: {
      course: { select: { price: true } },
      cohort: { select: { status: true, endsAt: true, price: true } },
    },
  });
  if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
  if (
    invite.revokedAt ||
    (invite.expiresAt && invite.expiresAt <= now) ||
    (invite.cohort &&
      invite.cohort.status !== "OPEN" &&
      invite.cohort.status !== "IN_PROGRESS") ||
    (invite.cohort?.endsAt && invite.cohort.endsAt <= now)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invite is no longer valid",
    });
  }
  return invite;
}

/**
 * Claims one use with a conditional increment. The `useCount < maxUses` guard is evaluated
 * atomically by the UPDATE (it re-checks the row after waiting on a concurrent claim), so it is
 * safe under READ COMMITTED without serializable isolation.
 */
async function claimEnrollmentInviteUse(
  tx: Prisma.TransactionClient,
  invite: { id: string; maxUses: number | null; useCount: number },
  now: Date,
) {
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invite has reached its use limit",
    });
  }

  const consumed = await tx.enrollmentInvite.updateMany({
    where: {
      id: invite.id,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      ...(invite.maxUses === null ? {} : { useCount: { lt: invite.maxUses } }),
    },
    data: { useCount: { increment: 1 } },
  });
  if (consumed.count !== 1) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Invite was already consumed",
    });
  }
}

export async function consumeEnrollmentInvite(
  tx: Prisma.TransactionClient,
  token: string,
  now: Date,
) {
  const invite = await findRedeemableEnrollmentInvite(tx, token, now);
  await claimEnrollmentInviteUse(tx, invite, now);
  return invite;
}

export async function redeemEnrollmentInvite(
  tx: Prisma.TransactionClient,
  input: { token: string; userId: string; now: Date },
) {
  const invite = await findRedeemableEnrollmentInvite(
    tx,
    input.token,
    input.now,
  );
  // Serialize redemptions by the same learner for the same target so a double-click cannot
  // consume two uses before either enrollment is visible.
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${`invite-redeem:${invite.cohortId ?? invite.courseId}:${input.userId}`}, 0))
  `;
  // Course invites join the course's default self-paced cohort.
  const existing = await tx.cohortEnrollment.findFirst({
    where: {
      userId: input.userId,
      cohort: invite.cohortId
        ? { id: invite.cohortId }
        : { defaultForCourseId: invite.courseId },
    },
  });
  const result = {
    type: invite.cohortId ? ("COHORT" as const) : ("COURSE" as const),
    courseId: invite.courseId,
    cohortId: invite.cohortId,
  };

  // Learners who are already enrolled do not consume a use.
  if (
    (existing?.status === "ACTIVE" || existing?.status === "COMPLETED") &&
    (existing.expiresAt === null || existing.expiresAt > input.now)
  ) {
    return result;
  }

  // Paid cohorts are joined through checkout; the invite only opens it.
  if (invite.cohort && effectiveCohortPrice(invite.cohort, invite.course) > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Kelas ini berbayar. Lanjutkan ke pembayaran.",
    });
  }

  if (invite.cohortId) {
    const otherClass = await findOtherRunningClass(tx, {
      cohortId: invite.cohortId,
      courseId: invite.courseId,
      userId: input.userId,
      now: input.now,
    });
    if (otherClass) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: otherRunningClassMessage(otherClass.name),
      });
    }
  }

  await claimEnrollmentInviteUse(tx, invite, input.now);
  const joined = {
    status: "ACTIVE",
    source: "INVITE",
    completedAt: null,
    expiresAt: null,
  } as const;
  if (invite.cohortId) {
    await tx.cohortEnrollment.upsert({
      where: {
        cohortId_userId: { cohortId: invite.cohortId, userId: input.userId },
      },
      create: { cohortId: invite.cohortId, userId: input.userId, ...joined },
      update: joined,
    });
  } else {
    await upsertDefaultCohortEnrollment(tx, {
      courseId: invite.courseId,
      userId: input.userId,
      create: joined,
    });
  }
  return result;
}
