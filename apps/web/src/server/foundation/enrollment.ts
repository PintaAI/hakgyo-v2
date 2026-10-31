import { db } from "~/server/db";
import { upsertDefaultCohortEnrollment } from "~/server/enrollment/default-cohort";
import { HANGEUL_MASTERY_COURSE_ID } from "./constants";

/**
 * System courses every new user is enrolled in, once they are published. The
 * Pola Bahasa curricula (POLA_BAHASA_COURSE_IDS) are not here yet: they are
 * imported without cohorts or enrollments until their rollout is decided.
 */
export const FOUNDATION_COURSE_IDS = [HANGEUL_MASTERY_COURSE_ID] as const;

/**
 * Gives a user every published system foundation course without adding them
 * to the system organization's membership list. Courses that do not exist or are not published are skipped.
 */
export async function ensureFoundationEnrollments(userId: string) {
  const courses = await db.course.findMany({
    where: { id: { in: [...FOUNDATION_COURSE_IDS] }, status: "PUBLISHED" },
    select: { id: true },
  });

  const enrollments = [];
  for (const course of courses) {
    enrollments.push(
      await db.$transaction((tx) =>
        upsertDefaultCohortEnrollment(tx, {
          courseId: course.id,
          userId,
          create: { source: "FOUNDATION", status: "ACTIVE" },
          update: {},
        }),
      ),
    );
  }
  return enrollments;
}
