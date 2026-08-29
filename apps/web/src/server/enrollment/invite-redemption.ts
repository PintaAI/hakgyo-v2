import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";

export async function consumeEnrollmentInvite(
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

  return invite;
}

export async function redeemEnrollmentInvite(
  tx: Prisma.TransactionClient,
  input: { token: string; userId: string; now: Date },
) {
  const invite = await consumeEnrollmentInvite(tx, input.token, input.now);
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
