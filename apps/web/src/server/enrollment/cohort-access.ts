import type { Prisma } from "../../../generated/prisma/client";

// Course access comes only from cohort memberships. Learners who study
// without a class belong to the course's default self-paced cohort
// (see default-cohort.ts).

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
