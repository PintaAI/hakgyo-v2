import type { Prisma } from "../../../generated/prisma/client";
import { getAccessibleCourseIds } from "~/server/learning/course-outline";

// Published courses the learner can study right now through a cohort
// membership that grants access.
//
// The candidate course ids are resolved from the learner's own memberships
// first (userId-indexed), so the course query never has to evaluate
// enrollment subqueries against every published course.
export async function enrolledCourseWhere(input: {
  userId: string;
  organizationId?: string;
  now?: Date;
}): Promise<Prisma.CourseWhereInput> {
  const courseIds = await getAccessibleCourseIds(
    input.userId,
    input.now ?? new Date(),
  );
  return {
    id: { in: [...courseIds] },
    organizationId: input.organizationId,
    status: "PUBLISHED",
  };
}
