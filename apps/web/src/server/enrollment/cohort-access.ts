import type { Prisma } from "../../../generated/prisma/client";
import { syncDefaultCohortEnrollments } from "~/server/enrollment/default-cohort";

export const accessGrantingCohortStatuses = ["OPEN", "IN_PROGRESS"] as const;

/**
 * Class cohorts whose memberships currently grant course access. Default
 * self-paced cohorts are excluded while direct course enrollments still
 * grant that access.
 */
export function accessGrantingCohortWhere(now: Date) {
  return {
    defaultForCourseId: null,
    status: { in: [...accessGrantingCohortStatuses] },
    OR: [{ endsAt: null }, { endsAt: { gt: now } }],
  } satisfies Prisma.CohortWhereInput;
}

export async function grantCohortCourseAccessForUsers(
  tx: Prisma.TransactionClient,
  input: { courseId: string; userIds: string[]; now?: Date },
) {
  const now = input.now ?? new Date();
  const userIds = [...new Set(input.userIds)];
  if (userIds.length === 0) return;

  await tx.courseEnrollment.createMany({
    data: userIds.map((userId) => ({
      courseId: input.courseId,
      userId,
      status: "ACTIVE" as const,
      source: "COHORT" as const,
    })),
    skipDuplicates: true,
  });
  await tx.courseEnrollment.updateMany({
    where: {
      courseId: input.courseId,
      userId: { in: userIds },
      OR: [
        { source: "COHORT" },
        { status: { in: ["PENDING", "CANCELLED"] } },
        { expiresAt: { lte: now } },
      ],
    },
    data: {
      status: "ACTIVE",
      source: "COHORT",
      completedAt: null,
      expiresAt: null,
    },
  });
  // Lapsed direct enrollments taken over above no longer back a
  // default cohort membership.
  await syncDefaultCohortEnrollments(tx, { courseId: input.courseId, userIds });
}

export async function reconcileCohortCourseAccess(
  tx: Prisma.TransactionClient,
  input: { courseId: string; userIds: string[]; now?: Date },
) {
  const now = input.now ?? new Date();
  const userIds = [...new Set(input.userIds)];
  if (userIds.length === 0) return;

  const otherAccess = await tx.cohortEnrollment.findMany({
    where: {
      userId: { in: userIds },
      status: { in: ["ACTIVE", "COMPLETED"] },
      cohort: { courseId: input.courseId, ...accessGrantingCohortWhere(now) },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  const usersWithOtherAccess = new Set(otherAccess.map(({ userId }) => userId));
  const usersToRevoke = userIds.filter(
    (userId) => !usersWithOtherAccess.has(userId),
  );
  if (usersToRevoke.length === 0) return;

  await tx.courseEnrollment.updateMany({
    where: {
      courseId: input.courseId,
      userId: { in: usersToRevoke },
      source: "COHORT",
    },
    data: { status: "CANCELLED", completedAt: null },
  });
}

export async function removeCohortEnrollmentAndReconcile(
  tx: Prisma.TransactionClient,
  input: { cohortId: string; courseId: string; userId: string },
) {
  const removed = await tx.cohortEnrollment.deleteMany({
    where: { cohortId: input.cohortId, userId: input.userId },
  });
  await reconcileCohortCourseAccess(tx, {
    courseId: input.courseId,
    userIds: [input.userId],
  });
  return removed;
}
