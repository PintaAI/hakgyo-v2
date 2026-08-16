import { beforeEach, describe, expect, mock, test } from "bun:test";

const cohortFindUnique = mock(() => Promise.resolve({ courseId: "course-1" }));
const courseFindUnique = mock(() =>
  Promise.resolve({
    id: "course-1",
    organizationId: "organization-1",
    owner: { userId: "owner-1" },
    organization: { members: [{ role: "TEACHER" }] },
    cohorts: [{ id: "sibling-cohort" }],
  }),
);
const cohortStaffFindFirst = mock(() =>
  Promise.resolve(null as { id: string } | null),
);

await mock.module("~/server/db", () => ({
  db: {
    cohort: { findUnique: cohortFindUnique },
    cohortStaff: { findFirst: cohortStaffFindFirst },
    course: { findUnique: courseFindUnique },
  },
}));

const { requireCohortPermission } = await import("./index");

describe("requireCohortPermission", () => {
  beforeEach(() => {
    cohortFindUnique.mockClear();
    courseFindUnique.mockClear();
    cohortStaffFindFirst.mockClear();
    cohortStaffFindFirst.mockResolvedValue(null);
  });

  test("denies staff assigned only to a sibling cohort", async () => {
    let error: unknown;
    try {
      await requireCohortPermission({
        cohortId: "cohort-1",
        userId: "teacher-1",
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({ code: "FORBIDDEN" });

    expect(cohortStaffFindFirst).toHaveBeenCalledWith({
      where: {
        cohortId: "cohort-1",
        organizationMember: { userId: "teacher-1" },
      },
      select: { id: true },
    });
  });

  test("allows staff assigned to the requested cohort", async () => {
    cohortStaffFindFirst.mockResolvedValue({ id: "assignment-1" });

    const cohort = await requireCohortPermission({
      cohortId: "cohort-1",
      userId: "teacher-1",
    });
    expect(cohort).toEqual({ courseId: "course-1" });
  });
});
