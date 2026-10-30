import { describe, expect, mock, test } from "bun:test";

import { learningRouter } from "~/server/api/routers/learning";
import { HANGEUL_MASTERY_COURSE_ID } from "~/server/foundation/constants";
import { createRequestCache } from "~/server/request-cache";

function cohort(
  id: string,
  courseTitle: string,
  defaultForCourseId = null as string | null,
) {
  return {
    id,
    name: defaultForCourseId ? "Kelas Mandiri" : id,
    courseId: `${courseTitle}-id`,
    defaultForCourseId,
    description: null,
    startsAt: null,
    endsAt: null,
    whatsappGroupUrl: null,
    course: { id: `${courseTitle}-id`, title: courseTitle },
    meetings: [],
    enrollments: [],
    staff: [],
  };
}

function createCaller(
  cohorts: ReturnType<typeof cohort>[],
  { hangeulMastered = false } = {},
) {
  const readUser = mock(() =>
    Promise.resolve({
      achievements: hangeulMastered ? [{ id: "badge-1" }] : [],
      preference: null,
    }),
  );
  const findCohorts = mock((_args: { where: object }) =>
    Promise.resolve(cohorts),
  );
  const countEnrollments = mock(
    (args: { where: { cohortId: { in: string[] } } }) =>
      Promise.resolve(
        args.where.cohortId.in.map((cohortId) => ({
          cohortId,
          _count: { _all: 12 },
        })),
      ),
  );
  const db = {
    user: { findUnique: readUser },
    cohort: { findMany: findCohorts },
    course: { findMany: () => Promise.resolve([]) },
    cohortEnrollment: { groupBy: countEnrollments },
  };
  const caller = learningRouter.createCaller({
    db: db as never,
    actorKind: "mcp",
    actorUserId: "user-1",
    session: null,
    headers: new Headers(),
    requestCache: createRequestCache(),
  });
  return { caller, readUser, countEnrollments, findCohorts };
}

describe("classes on Belajar", () => {
  test("lists classes first, then each Kelas Mandiri by curriculum title", async () => {
    const { caller } = createCaller([
      cohort("vocab-mandiri", "Kosakata", "vocab"),
      cohort("class-1", "TOPIK"),
      cohort("hangeul-mandiri", "Hangeul Mastery", "hangeul"),
    ]);

    const cohorts = await caller.listMyCohorts();
    expect(cohorts.map(({ id, selfPaced }) => ({ id, selfPaced }))).toEqual([
      { id: "class-1", selfPaced: false },
      { id: "hangeul-mandiri", selfPaced: true },
      { id: "vocab-mandiri", selfPaced: true },
    ]);
  });

  test("counts members of scheduled classes only", async () => {
    const { caller, countEnrollments } = createCaller([
      cohort("class-1", "TOPIK"),
      cohort("hangeul-mandiri", "Hangeul Mastery", "hangeul"),
    ]);

    const cohorts = await caller.listMyCohorts();
    expect(countEnrollments).toHaveBeenCalledTimes(1);
    expect(countEnrollments.mock.calls[0]?.[0].where.cohortId.in).toEqual([
      "class-1",
    ]);
    expect(cohorts.map((item) => item._count.enrollments)).toEqual([12, 0]);
  });

  test("skips counting when only a Kelas Mandiri is listed", async () => {
    const { caller, countEnrollments } = createCaller([
      cohort("hangeul-mandiri", "Hangeul Mastery", "hangeul"),
    ]);

    await caller.listMyCohorts();
    expect(countEnrollments).not.toHaveBeenCalled();
  });

  test("reads the Hangeul visibility once per request", async () => {
    const { caller, readUser } = createCaller([
      cohort("hangeul-mandiri", "Hangeul Mastery", "hangeul"),
    ]);

    await Promise.all([
      caller.listMyCohorts(),
      caller.listMyCohortMilestones(),
    ]);
    expect(readUser).toHaveBeenCalledTimes(1);
  });

  test("leaves out the Hangeul Kelas Mandiri once the learner mastered and hid it", async () => {
    const hidden = createCaller([], { hangeulMastered: true });
    await hidden.caller.listMyCohorts();
    expect(
      JSON.stringify(hidden.findCohorts.mock.calls[0]?.[0].where),
    ).toContain(HANGEUL_MASTERY_COURSE_ID);

    const shown = createCaller([]);
    await shown.caller.listMyCohorts();
    expect(
      JSON.stringify(shown.findCohorts.mock.calls[0]?.[0].where),
    ).not.toContain(HANGEUL_MASTERY_COURSE_ID);
  });
});
