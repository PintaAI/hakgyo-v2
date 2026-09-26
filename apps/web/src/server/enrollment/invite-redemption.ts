import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";

async function findRedeemableEnrollmentInvite(
  tx: Prisma.TransactionClient,
  token: string,
  now: Date,
) {
  const invite = await tx.enrollmentInvite.findUnique({
    where: { token },
    include: { cohort: { select: { status: true, endsAt: true } } },
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
  const existing = invite.cohortId
    ? await tx.cohortEnrollment.findUnique({
        where: {
          cohortId_userId: {
            cohortId: invite.cohortId,
            userId: input.userId,
          },
        },
      })
    : await tx.courseEnrollment.findUnique({
        where: {
          courseId_userId: {
            courseId: invite.courseId,
            userId: input.userId,
          },
        },
      });

  // Learners who are already enrolled do not consume a use.
  if (existing?.status === "ACTIVE" || existing?.status === "COMPLETED") {
    if (invite.cohortId) {
      await grantCohortCourseAccess(
        tx,
        invite.courseId,
        input.userId,
        input.now,
      );
    }
    return {
      type: invite.cohortId ? ("COHORT" as const) : ("COURSE" as const),
      courseId: invite.courseId,
      cohortId: invite.cohortId,
    };
  }

  await claimEnrollmentInviteUse(tx, invite, input.now);
  if (invite.cohortId) {
    await grantCohortCourseAccess(tx, invite.courseId, input.userId, input.now);
    await tx.cohortEnrollment.upsert({
      where: {
        cohortId_userId: {
          cohortId: invite.cohortId,
          userId: input.userId,
        },
      },
      create: {
        cohortId: invite.cohortId,
        userId: input.userId,
        status: "ACTIVE",
        source: "INVITE",
      },
      update: { status: "ACTIVE", completedAt: null },
    });
  } else {
    await tx.courseEnrollment.upsert({
      where: {
        courseId_userId: {
          courseId: invite.courseId,
          userId: input.userId,
        },
      },
      create: {
        courseId: invite.courseId,
        userId: input.userId,
        status: "ACTIVE",
        source: "INVITE",
      },
      update: {
        status: "ACTIVE",
        source: "INVITE",
        completedAt: null,
        expiresAt: null,
      },
    });
  }

  return {
    type: invite.cohortId ? ("COHORT" as const) : ("COURSE" as const),
    courseId: invite.courseId,
    cohortId: invite.cohortId,
  };
}

async function grantCohortCourseAccess(
  tx: Prisma.TransactionClient,
  courseId: string,
  userId: string,
  now: Date,
) {
  const enrollment = await tx.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
    select: { id: true, status: true, source: true, expiresAt: true },
  });
  const hasIndependentAccess =
    enrollment &&
    enrollment.source !== "COHORT" &&
    (enrollment.status === "ACTIVE" || enrollment.status === "COMPLETED") &&
    (enrollment.expiresAt === null || enrollment.expiresAt > now);
  if (hasIndependentAccess) return;

  await tx.courseEnrollment.upsert({
    where: { courseId_userId: { courseId, userId } },
    create: {
      courseId,
      userId,
      status: "ACTIVE",
      source: "COHORT",
    },
    update: {
      status: "ACTIVE",
      source: "COHORT",
      completedAt: null,
      expiresAt: null,
    },
  });
}
