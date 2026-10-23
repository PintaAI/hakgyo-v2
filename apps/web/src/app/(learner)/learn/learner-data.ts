import "server-only";

import { HANGEUL_MASTERY_COURSE_ID } from "@hakgyo/shared/hangeul";
import { cache } from "react";

import { api } from "~/trpc/server";

// The learner layout and pages render in the same request; share one call for
// procedures both of them need.
export const getMyCourses = cache(() => api.learning.listMyCourses());

/**
 * "Kurikulum saya" in the sidebar: the learner's courses without Hangeul
 * Mastery once it is mastered and not shown again in Pengaturan. The course
 * itself stays reachable through direct links.
 */
export const getMySidebarCourses = cache(async () => {
  const [courses, hangeul] = await Promise.all([
    getMyCourses(),
    api.preferences.get(),
  ]);
  return hangeul.hangeulHidden
    ? courses.filter((course) => course.id !== HANGEUL_MASTERY_COURSE_ID)
    : courses;
});
