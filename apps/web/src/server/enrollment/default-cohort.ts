import type { Prisma } from "../../../generated/prisma/client";

// Imported by prisma/seed.ts, so keep this module free of `~/` imports.

type DefaultCohortDb = Pick<
  Prisma.TransactionClient,
  "course" | "cohort" | "cohortEnrollment"
>;

export const DEFAULT_COHORT_NAME = "Kelas Mandiri";

/**
 * The row of a course's Kelas Mandiri: open from the start, no dates, free,
 * the organization's join mode, and no staff. Both
 * first use (`ensureDefaultCohort`) and staff creating it (`cohort.create`)
 * start from this.
 */
export function kelasMandiriData(course: {
  id: string;
  organizationId: string;
}) {
  return {
    courseId: course.id,
    organizationId: course.organizationId,
    name: DEFAULT_COHORT_NAME,
    status: "OPEN",
    defaultForCourseId: course.id,
  } satisfies Prisma.CohortUncheckedCreateInput;
}

/** The course's Kelas Mandiri (its open-ended cohort), created on first use. */
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
    data: kelasMandiriData({ id: courseId, ...course }),
    skipDuplicates: true,
  });
  return db.cohort.findUniqueOrThrow({
    where: { defaultForCourseId: courseId },
    select: { id: true },
  });
}

type DefaultMembershipData = Pick<
  Prisma.CohortEnrollmentUncheckedCreateInput,
  "status" | "source" | "completedAt" | "expiresAt"
>;

/**
 * Creates or updates the learner's membership in the course's default
 * cohort. `create` is used for a new membership and `update` (defaulting to
 * `create`) for an existing one.
 */
export async function upsertDefaultCohortEnrollment(
  db: DefaultCohortDb,
  input: {
    courseId: string;
    userId: string;
    create: DefaultMembershipData;
    update?: Partial<DefaultMembershipData>;
  },
) {
  const cohort = await ensureDefaultCohort(db, input.courseId);
  const where = { cohortId: cohort.id, userId: input.userId };
  // createMany + updateMany instead of upsert so concurrent joins of the same
  // learner cannot fail on the (cohortId, userId) unique constraint.
  const created = await db.cohortEnrollment.createMany({
    data: { ...where, ...input.create },
    skipDuplicates: true,
  });
  const update = input.update ?? input.create;
  if (created.count === 0 && Object.keys(update).length > 0) {
    await db.cohortEnrollment.updateMany({ where, data: update });
  }
  return db.cohortEnrollment.findUniqueOrThrow({
    where: { cohortId_userId: where },
  });
}
