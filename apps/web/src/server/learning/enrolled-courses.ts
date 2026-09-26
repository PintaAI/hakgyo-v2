import type { Prisma } from "../../../generated/prisma/client";
import { activeEnrollmentStatuses } from "~/server/authorization";
import { db } from "~/server/db";
import { getActiveCohortCourseIds } from "~/server/learning/course-outline";

// Published courses the learner can study right now: a live direct enrollment
// or an active enrollment in a cohort that still grants access.
//
// The candidate course ids are resolved from the learner's own enrollments
// first (userId-indexed), so the course query never has to evaluate
// enrollment subqueries against every published course.
export async function enrolledCourseWhere(input: {
  userId: string;
  organizationId?: string;
  now?: Date;
}): Promise<Prisma.CourseWhereInput> {
  const now = input.now ?? new Date();
  const [directEnrollments, cohortCourseIds] = await Promise.all([
    db.courseEnrollment.findMany({
      where: {
        userId: input.userId,
        status: { in: [...activeEnrollmentStatuses] },
        source: { not: "COHORT" },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { courseId: true },
    }),
    getActiveCohortCourseIds(input.userId, now),
  ]);
  const courseIds = new Set(cohortCourseIds);
  for (const { courseId } of directEnrollments) courseIds.add(courseId);
  return {
    id: { in: [...courseIds] },
    organizationId: input.organizationId,
    status: "PUBLISHED",
  };
}
