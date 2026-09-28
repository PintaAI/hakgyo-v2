import type { Prisma } from "../../../generated/prisma/client";

// Imported by prisma/seed.ts, so keep this module free of `~/` imports.

type DefaultCohortDb = Pick<
  Prisma.TransactionClient,
  "course" | "cohort" | "courseEnrollment" | "cohortEnrollment"
>;

export const DEFAULT_COHORT_NAME = "Belajar mandiri";

/** The course's self-paced cohort, created on first use. */
export async function ensureDefaultCohort(
  db: DefaultCohortDb,
  courseId: string,
) {
  const existing = await db.cohort.findUnique({
    where: { defaultForCourseId: courseId },
    select: { id: true },
  });
  if (existing) return existing;

  const course = await db.course.findUniqueOrThrow({
    where: { id: courseId },
    select: { organizationId: true },
  });
  // skipDuplicates: a concurrent first use must not abort this one.
  await db.cohort.createMany({
    data: {
      courseId,
      organizationId: course.organizationId,
      name: DEFAULT_COHORT_NAME,
      status: "OPEN",
      defaultForCourseId: courseId,
    },
    skipDuplicates: true,
  });
  return db.cohort.findUniqueOrThrow({
    where: { defaultForCourseId: courseId },
    select: { id: true },
  });
}

/**
 * Mirrors the learners' direct course enrollments into the course's default
 * cohort. Call after every write that can create, change or remove a direct
 * enrollment (any source except COHORT, which only shadows class cohort
 * memberships) so both records agree until access is read from cohorts alone.
 */
export async function syncDefaultCohortEnrollments(
  db: DefaultCohortDb,
  input: { courseId: string; userIds: string[] },
) {
  const userIds = [...new Set(input.userIds)];
  if (userIds.length === 0) return;

  const direct = await db.courseEnrollment.findMany({
    where: {
      courseId: input.courseId,
      userId: { in: userIds },
      source: { not: "COHORT" },
    },
    select: {
      userId: true,
      status: true,
      source: true,
      enrolledAt: true,
      completedAt: true,
      expiresAt: true,
    },
  });
  const cohort =
    direct.length > 0
      ? await ensureDefaultCohort(db, input.courseId)
      : await db.cohort.findUnique({
          where: { defaultForCourseId: input.courseId },
          select: { id: true },
        });
  if (!cohort) return;

  const directUserIds = new Set(direct.map(({ userId }) => userId));
  const removed = userIds.filter((userId) => !directUserIds.has(userId));
  if (removed.length > 0) {
    await db.cohortEnrollment.deleteMany({
      where: { cohortId: cohort.id, userId: { in: removed } },
    });
  }
  // createMany + updateMany instead of upsert so concurrent syncs of the same
  // learner cannot fail on the (cohortId, userId) unique constraint.
  await db.cohortEnrollment.createMany({
    data: direct.map((enrollment) => ({ cohortId: cohort.id, ...enrollment })),
    skipDuplicates: true,
  });
  for (const { userId, ...enrollment } of direct) {
    await db.cohortEnrollment.updateMany({
      where: { cohortId: cohort.id, userId },
      data: enrollment,
    });
  }
}
