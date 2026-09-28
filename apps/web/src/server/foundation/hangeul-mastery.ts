import { db } from "~/server/db";
import { syncDefaultCohortEnrollments } from "~/server/enrollment/default-cohort";
import { HANGEUL_MASTERY_COURSE_ID } from "./constants";

/**
 * Gives a user the system foundation course without adding them to the
 * system organization's membership list.
 */
export async function ensureHangeulMasteryEnrollment(userId: string) {
  const course = await db.course.findUnique({
    where: { id: HANGEUL_MASTERY_COURSE_ID },
    select: { id: true, status: true },
  });

  if (course?.status !== "PUBLISHED") return null;

  return db.$transaction(async (tx) => {
    const enrollment = await tx.courseEnrollment.upsert({
      where: { courseId_userId: { courseId: course.id, userId } },
      create: {
        courseId: course.id,
        userId,
        source: "FOUNDATION",
        status: "ACTIVE",
      },
      update: {},
    });
    await syncDefaultCohortEnrollments(tx, {
      courseId: course.id,
      userIds: [userId],
    });
    return enrollment;
  });
}
