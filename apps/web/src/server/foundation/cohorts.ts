import { env } from "~/env";
import type { Prisma } from "../../../generated/prisma/client";

type EnrollmentDb = Pick<
  Prisma.TransactionClient,
  "cohort" | "cohortEnrollment"
>;

function cohortIdList(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
}

/** Cohorts every learner joins on sign-in (`AUTO_ENROLL_COHORT_IDS`). */
export function autoEnrollCohortIds() {
  return cohortIdList(env.AUTO_ENROLL_COHORT_IDS);
}

/**
 * Cohorts a learner joins once they earn the Hangeul Mastery badge, by
 * finishing the course or passing the onboarding test
 * (`HANGEUL_MASTERY_NEXT_COHORT_IDS`): the Pola Bahasa classes.
 */
export function hangeulMasteryNextCohortIds() {
  return cohortIdList(env.HANGEUL_MASTERY_NEXT_COHORT_IDS);
}

/**
 * Adds the learner to the given cohorts as a FOUNDATION membership, without
 * adding them to the cohorts' organizations. Existing memberships, whatever
 * their status, are left alone; unknown ids, closed cohorts and cohorts of
 * unpublished courses are skipped.
 */
export async function enrollInFoundationCohorts(
  db: EnrollmentDb,
  userId: string,
  cohortIds: string[],
) {
  if (cohortIds.length === 0) return { count: 0 };
  const cohorts = await db.cohort.findMany({
    where: {
      id: { in: cohortIds },
      status: { in: ["OPEN", "IN_PROGRESS"] },
      course: { status: "PUBLISHED" },
    },
    select: { id: true },
  });
  if (cohorts.length === 0) return { count: 0 };
  return db.cohortEnrollment.createMany({
    data: cohorts.map((cohort) => ({
      cohortId: cohort.id,
      userId,
      source: "FOUNDATION" as const,
      status: "ACTIVE" as const,
    })),
    skipDuplicates: true,
  });
}
