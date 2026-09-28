import { db } from "~/server/db";
import { upsertDefaultCohortEnrollment } from "~/server/enrollment/default-cohort";
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

  return db.$transaction((tx) =>
    upsertDefaultCohortEnrollment(tx, {
      courseId: course.id,
      userId,
      create: { source: "FOUNDATION", status: "ACTIVE" },
      update: {},
    }),
  );
}
