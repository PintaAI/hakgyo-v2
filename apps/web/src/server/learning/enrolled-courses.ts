import type { Prisma } from "../../../generated/prisma/client";
import { activeEnrollmentStatuses } from "~/server/authorization";
import { accessGrantingCohortStatuses } from "~/server/enrollment/cohort-access";

// Published courses the learner can study right now: a live direct enrollment
// or an active enrollment in a cohort that still grants access.
export function enrolledCourseWhere(input: {
  userId: string;
  organizationId?: string;
  now?: Date;
}): Prisma.CourseWhereInput {
  const now = input.now ?? new Date();
  return {
    organizationId: input.organizationId,
    status: "PUBLISHED",
    OR: [
      {
        enrollments: {
          some: {
            userId: input.userId,
            status: { in: [...activeEnrollmentStatuses] },
            source: { not: "COHORT" },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        },
      },
      {
        cohorts: {
          some: {
            status: { in: [...accessGrantingCohortStatuses] },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            enrollments: {
              some: {
                userId: input.userId,
                status: { in: [...activeEnrollmentStatuses] },
              },
            },
          },
        },
      },
    ],
  };
}
