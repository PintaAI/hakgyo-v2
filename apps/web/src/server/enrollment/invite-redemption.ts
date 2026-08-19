import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";

export async function consumeEnrollmentInvite(
  tx: Prisma.TransactionClient,
  token: string,
  now: Date,
) {
  const invite = await tx.enrollmentInvite.findUnique({ where: { token } });
  if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
  if (invite.revokedAt || (invite.expiresAt && invite.expiresAt <= now)) {
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
        update: { status: "ACTIVE", completedAt: null },
      });
    }
    return {
      type: invite.cohortId ? ("COHORT" as const) : ("COURSE" as const),
      courseId: invite.courseId,
      cohortId: invite.cohortId,
    };
  }

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
    update: { status: "ACTIVE", completedAt: null },
  });
  if (invite.cohortId) {
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
  }

  return {
    type: invite.cohortId ? ("COHORT" as const) : ("COURSE" as const),
    courseId: invite.courseId,
    cohortId: invite.cohortId,
  };
}
