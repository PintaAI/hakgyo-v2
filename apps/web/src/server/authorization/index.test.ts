import { beforeEach, describe, expect, mock, test } from "bun:test";

const cohortFindUnique = mock(() => Promise.resolve({ courseId: "course-1" }));
const courseFindUnique = mock(() =>
  Promise.resolve({
    id: "course-1",
    organizationId: "organization-1",
    ownerMembershipId: "owner-membership",
    owner: { userId: "owner-1" },
    collaborators: [],
    organization: {
      permissionMode: "ADVANCED",
      members: [{ role: "TEACHER" }],
    },
    cohorts: [{ id: "sibling-cohort" }],
  }),
);
const cohortStaffFindFirst = mock(() =>
  Promise.resolve(
    null as { id: string; role: "INSTRUCTOR" | "ASSISTANT" } | null,
  ),
);
const organizationMemberFindUnique = mock(() =>
  Promise.resolve({
    id: "teacher-membership",
    organizationId: "organization-1",
    role: "TEACHER" as const,
    userId: "teacher-1",
    organization: {
      permissionMode: "ADVANCED",
      teacherCanCreateCourse: true,
    },
  }),
);

await mock.module("~/server/db", () => ({
  db: {
    cohort: { findUnique: cohortFindUnique },
    cohortStaff: { findFirst: cohortStaffFindFirst },
    course: { findUnique: courseFindUnique },
    organizationMember: { findUnique: organizationMemberFindUnique },
  },
}));

const { requireCohortPermission, requireOrganizationPermission } =
  await import("./index");

async function expectForbidden(promise: Promise<unknown>) {
  let error: unknown;
  try {
    await promise;
  } catch (caught) {
    error = caught;
  }
  expect(error).toMatchObject({ code: "FORBIDDEN" });
}

describe("requireCohortPermission", () => {
  beforeEach(() => {
    cohortFindUnique.mockClear();
    courseFindUnique.mockClear();
    cohortStaffFindFirst.mockClear();
    organizationMemberFindUnique.mockClear();
    cohortStaffFindFirst.mockResolvedValue(null);
  });

  test("denies staff assigned only to a sibling cohort", async () => {
    await expectForbidden(
      requireCohortPermission({
        cohortId: "cohort-1",
        permission: "view",
        userId: "teacher-1",
      }),
    );
  });

  test("simple mode still denies an unassigned teacher", async () => {
    courseFindUnique.mockResolvedValueOnce({
      id: "course-1",
      organizationId: "organization-1",
      ownerMembershipId: "owner-membership",
      owner: { userId: "owner-1" },
      collaborators: [],
      organization: {
        permissionMode: "SIMPLE",
        members: [{ role: "TEACHER" }],
      },
      cohorts: [{ id: "sibling-cohort" }],
    });

    await expectForbidden(
      requireCohortPermission({
        cohortId: "cohort-1",
        permission: "view",
        userId: "teacher-1",
      }),
    );
  });

  test("simple mode gives assigned teachers full cohort operations", async () => {
    courseFindUnique.mockResolvedValueOnce({
      id: "course-1",
      organizationId: "organization-1",
      ownerMembershipId: "owner-membership",
      owner: { userId: "owner-1" },
      collaborators: [],
      organization: {
        permissionMode: "SIMPLE",
        members: [{ role: "TEACHER" }],
      },
      cohorts: [{ id: "cohort-1" }],
    });
    cohortStaffFindFirst.mockResolvedValue({
      id: "assignment-1",
      role: "ASSISTANT",
    });

    const access = await requireCohortPermission({
      cohortId: "cohort-1",
      permission: "delete",
      userId: "teacher-1",
    });
    expect(access.access.manageMeetings).toBe(true);
    expect(access.access.manageStaff).toBe(false);
  });

  test("instructor manages operations but cannot manage staff", async () => {
    cohortStaffFindFirst.mockResolvedValue({
      id: "assignment-1",
      role: "INSTRUCTOR",
    });

    const access = await requireCohortPermission({
      cohortId: "cohort-1",
      permission: "meetings.manage",
      userId: "teacher-1",
    });
    expect(access).toMatchObject({ courseId: "course-1" });
    await expectForbidden(
      requireCohortPermission({
        cohortId: "cohort-1",
        permission: "staff.manage",
        userId: "teacher-1",
      }),
    );
  });

  test("assistant manages learners but not meetings", async () => {
    cohortStaffFindFirst.mockResolvedValue({
      id: "assignment-1",
      role: "ASSISTANT",
    });

    const access = await requireCohortPermission({
      cohortId: "cohort-1",
      permission: "learners.manage",
      userId: "teacher-1",
    });
    expect(access).toMatchObject({ courseId: "course-1" });
    await expectForbidden(
      requireCohortPermission({
        cohortId: "cohort-1",
        permission: "meetings.manage",
        userId: "teacher-1",
      }),
    );
  });

  test("course owner manages every cohort action", async () => {
    const access = await requireCohortPermission({
      cohortId: "cohort-1",
      permission: "delete",
      userId: "owner-1",
    });
    expect(access).toMatchObject({ courseId: "course-1" });
  });
});

describe("requireOrganizationPermission", () => {
  test("honors the teacher course creation policy", async () => {
    organizationMemberFindUnique.mockResolvedValueOnce({
      id: "teacher-membership",
      organizationId: "organization-1",
      role: "TEACHER",
      userId: "teacher-1",
      organization: {
        permissionMode: "ADVANCED",
        teacherCanCreateCourse: false,
      },
    });
    await expectForbidden(
      requireOrganizationPermission({
        organizationId: "organization-1",
        permission: "course.create",
        userId: "teacher-1",
      }),
    );

    const membership = await requireOrganizationPermission({
      organizationId: "organization-1",
      permission: "course.create",
      userId: "teacher-1",
    });
    expect(membership.id).toBe("teacher-membership");
  });

  test("simple mode always allows organization members to create courses", async () => {
    organizationMemberFindUnique.mockResolvedValueOnce({
      id: "teacher-membership",
      organizationId: "organization-1",
      role: "TEACHER",
      userId: "teacher-1",
      organization: {
        permissionMode: "SIMPLE",
        teacherCanCreateCourse: false,
      },
    });

    const membership = await requireOrganizationPermission({
      organizationId: "organization-1",
      permission: "course.create",
      userId: "teacher-1",
    });
    expect(membership.id).toBe("teacher-membership");
  });
});
