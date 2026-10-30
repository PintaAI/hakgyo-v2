import type { Prisma } from "../../../generated/prisma/client";

// Course access comes only from cohort memberships. Learners who study
// without a scheduled class belong to the course's Kelas Mandiri, its
// open-ended default cohort (see default-cohort.ts).

export const liveCohortStatuses = ["OPEN", "IN_PROGRESS"] as const;

/**
 * Cohorts whose members may study the course: the default cohort, and class
 * cohorts that are open, running or completed. Learners keep the material
 * after their class ends; draft and cancelled cohorts grant nothing.
 */
export const courseAccessCohortStatuses = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

const accessMembershipStatuses = ["ACTIVE", "COMPLETED"] as const;

/** Class cohorts running now: schedules, meetings and attempt attribution. */
export function liveClassCohortWhere(now: Date) {
  return {
    defaultForCourseId: null,
    status: { in: [...liveCohortStatuses] },
    OR: [{ endsAt: null }, { endsAt: { gt: now } }],
  } satisfies Prisma.CohortWhereInput;
}

/**
 * The learner's classes on the Belajar screen: running class cohorts, and
 * the Kelas Mandiri of courses they study on their own. A Kelas Mandiri is
 * paused (no card, access kept) while the learner has access in a running
 * class of the same course, and returns once that class ends or they leave
 * it. `hiddenKelasMandiriCourseIds` leaves out the Kelas Mandiri of those
 * courses.
 */
export function learnerClassCohortWhere(
  userId: string,
  now: Date,
  options: { hiddenKelasMandiriCourseIds?: string[] } = {},
) {
  const hidden = options.hiddenKelasMandiriCourseIds ?? [];
  const membership = {
    userId,
    status: { in: [...accessMembershipStatuses] },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  } satisfies Prisma.CohortEnrollmentWhereInput;
  const liveClass = liveClassCohortWhere(now);
  return {
    OR: [
      { ...liveClass, enrollments: { some: membership } },
      {
        defaultForCourseId: {
          not: null,
          ...(hidden.length > 0 ? { notIn: hidden } : {}),
        },
        status: { in: [...courseAccessCohortStatuses] },
        enrollments: { some: membership },
        course: {
          cohorts: {
            none: { ...liveClass, enrollments: { some: membership } },
          },
        },
      },
    ],
  } satisfies Prisma.CohortWhereInput;
}

/** The learner's memberships that currently grant course access. */
export function courseAccessMembershipWhere(userId: string, now: Date) {
  return {
    userId,
    status: { in: [...accessMembershipStatuses] },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    cohort: { status: { in: [...courseAccessCohortStatuses] } },
  } satisfies Prisma.CohortEnrollmentWhereInput;
}

/** Cohorts through which the learner currently has course access. */
export function courseAccessCohortWhere(userId: string, now: Date) {
  const { cohort, ...membership } = courseAccessMembershipWhere(userId, now);
  return {
    ...cohort,
    enrollments: { some: membership },
  } satisfies Prisma.CohortWhereInput;
}

/** Course filter: the learner has a membership granting access to it. */
export function courseAccessWhere(userId: string, now: Date) {
  return {
    cohorts: { some: courseAccessCohortWhere(userId, now) },
  } satisfies Prisma.CourseWhereInput;
}

/**
 * The learner's other running class of the same course, if any. A learner takes one class of a
 * course at a time; they can join another once that class or their membership has ended. The
 * Kelas Mandiri is not a scheduled class and never counts. Without `cohortId`, any running
 * class counts (used when joining the Kelas Mandiri).
 */
export async function findOtherRunningClass(
  db: Pick<Prisma.TransactionClient, "cohortEnrollment">,
  input: { cohortId?: string; courseId: string; userId: string; now: Date },
) {
  const enrollment = await db.cohortEnrollment.findFirst({
    where: {
      userId: input.userId,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }],
      ...(input.cohortId ? { cohortId: { not: input.cohortId } } : {}),
      cohort: { courseId: input.courseId, ...liveClassCohortWhere(input.now) },
    },
    select: { cohort: { select: { id: true, name: true } } },
  });
  return enrollment?.cohort ?? null;
}

export function otherRunningClassMessage(className: string) {
  return `Kamu masih terdaftar di ${className}. Satu kurikulum hanya bisa diikuti di satu kelas pada saat yang sama.`;
}
