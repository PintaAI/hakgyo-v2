import { db } from "~/server/db";

/**
 * Module and cohort counts for a page of courses, shaped like Prisma's
 * `_count: { select: { modules: true, cohorts: true } }`.
 *
 * A relation `_count` inside a list `findMany` is compiled into a grouped
 * aggregate over the whole child table, so the counts are loaded with one
 * follow-up query per relation keyed by the page's course ids instead.
 */
export async function withCourseCounts<T extends { id: string }>(
  courses: T[],
): Promise<Array<T & { _count: { modules: number; cohorts: number } }>> {
  if (courses.length === 0) return [];
  const where = { courseId: { in: courses.map((course) => course.id) } };
  const [modules, cohorts] = await Promise.all([
    db.courseModule.groupBy({
      by: ["courseId"],
      where,
      _count: { _all: true },
    }),
    db.cohort.groupBy({ by: ["courseId"], where, _count: { _all: true } }),
  ]);
  const moduleCounts = new Map(
    modules.map((row) => [row.courseId, row._count._all]),
  );
  const cohortCounts = new Map(
    cohorts.map((row) => [row.courseId, row._count._all]),
  );
  return courses.map((course) => ({
    ...course,
    _count: {
      modules: moduleCounts.get(course.id) ?? 0,
      cohorts: cohortCounts.get(course.id) ?? 0,
    },
  }));
}
