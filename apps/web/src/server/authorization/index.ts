import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import { EnrollmentStatus } from "../../../generated/prisma/enums";
import { db } from "~/server/db";
import { accessGrantingCohortStatuses } from "~/server/enrollment/cohort-access";
import { getCourseOutlineForUser } from "~/server/learning/course-outline";
import { memoizeForRequest } from "~/server/request-cache";
import {
  canAccessLearningContent,
  canManageContent,
  evaluateCourseAccess,
  getCohortCapabilities,
  getCourseCapabilities,
  hasPermission,
  type Permission,
} from "./permissions";

export { hasPermission, type Permission } from "./permissions";

export const activeEnrollmentStatuses = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.COMPLETED,
] as const;

const forbidden = () => {
  throw new TRPCError({ code: "FORBIDDEN" });
};

// Nullable lookup shared by every membership guard so one request only reads a
// membership once, whichever guard asks first.
function findOrganizationMembership(organizationId: string, userId: string) {
  return memoizeForRequest(`membership:${organizationId}:${userId}`, () =>
    db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: {
        id: true,
        organizationId: true,
        role: true,
        userId: true,
        organization: {
          select: { permissionMode: true, teacherCanCreateCourse: true },
        },
      },
    }),
  );
}

export async function requireOrganizationMembership(input: {
  organizationId: string;
  userId: string;
}) {
  const membership = await findOrganizationMembership(
    input.organizationId,
    input.userId,
  );

  if (!membership) return forbidden();
  return membership;
}

export async function requireOrganizationPermission(input: {
  organizationId: string;
  permission: Permission;
  userId: string;
}) {
  const membership = await requireOrganizationMembership(input);

  if (
    !hasPermission(membership.role, input.permission) ||
    (membership.organization.permissionMode === "SIMPLE" &&
      membership.role === "ADMIN" &&
      input.permission === "course.create") ||
    (membership.organization.permissionMode === "ADVANCED" &&
      membership.role === "TEACHER" &&
      input.permission === "course.create" &&
      !membership.organization.teacherCanCreateCourse)
  ) {
    return forbidden();
  }

  return membership;
}

export async function requireContentAuthor(input: {
  organizationId: string;
  userId: string;
  createdByMembershipId?: string;
  action?: "edit" | "delete";
}) {
  const membership = await findOrganizationMembership(
    input.organizationId,
    input.userId,
  );

  if (
    !membership ||
    (membership.organization.permissionMode === "ADVANCED" &&
      membership.role === "TEACHER" &&
      input.createdByMembershipId !== undefined &&
      input.createdByMembershipId !== membership.id)
  ) {
    return forbidden();
  }

  return membership;
}

function courseScopeSelect(userId: string) {
  return {
    id: true,
    organizationId: true,
    ownerMembershipId: true,
    owner: { select: { userId: true } },
    collaborators: {
      where: { role: "EDITOR", organizationMember: { userId } },
      select: { id: true },
      take: 1,
    },
    organization: {
      select: {
        permissionMode: true,
        members: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
    },
    cohorts: {
      where: { staff: { some: { organizationMember: { userId } } } },
      select: { id: true },
      take: 1,
    },
  } satisfies Prisma.CourseSelect;
}

function toCourseScope(
  course: Prisma.CourseGetPayload<{
    select: ReturnType<typeof courseScopeSelect>;
  }>,
  userId: string,
) {
  return {
    organizationRole: course.organization.members[0]?.role,
    permissionMode: course.organization.permissionMode,
    isCourseOwner: course.owner.userId === userId,
    isCourseEditor: course.collaborators.length > 0,
    isCohortStaff: course.cohorts.length > 0,
  };
}

async function getCourseScope(courseId: string, userId: string) {
  const course = await memoizeForRequest(
    `courseScope:${courseId}:${userId}`,
    () =>
      db.course.findUnique({
        where: { id: courseId },
        select: courseScopeSelect(userId),
      }),
  );

  if (!course) throw new TRPCError({ code: "NOT_FOUND" });

  return { course, scope: toCourseScope(course, userId) };
}

export async function requireCoursePermission(input: {
  courseId: string;
  permission: "course.view" | "course.manage" | "content.manage";
  userId: string;
}) {
  const result = await getCourseScope(input.courseId, input.userId);
  const evaluation = evaluateCourseAccess(result.scope);
  const allowed =
    input.permission === "course.view"
      ? evaluation.allowed.view
      : input.permission === "course.manage"
        ? evaluation.allowed.manage
        : evaluation.allowed.manageContent;

  if (!allowed) return forbidden();
  return {
    ...result.course,
    access: evaluation.access,
  };
}

export type CohortPermission =
  | "view"
  | "update"
  | "delete"
  | "staff.manage"
  | "learners.manage"
  | "invites.manage"
  | "meetings.manage"
  | "assessment.review";

export async function requireCohortPermission(input: {
  cohortId: string;
  userId: string;
  permission?: CohortPermission;
}) {
  // One round trip for the cohort, its course scope and the caller's exact
  // staff assignment on this cohort.
  const result = await memoizeForRequest(
    `cohortScope:${input.cohortId}:${input.userId}`,
    () =>
      db.cohort.findUnique({
        where: { id: input.cohortId },
        select: {
          id: true,
          organizationId: true,
          courseId: true,
          status: true,
          endsAt: true,
          course: { select: courseScopeSelect(input.userId) },
          staff: {
            where: { organizationMember: { userId: input.userId } },
            select: { id: true, role: true },
            take: 1,
          },
        },
      }),
  );
  if (!result) throw new TRPCError({ code: "NOT_FOUND" });

  const { course, staff, ...cohort } = result;
  const exactStaffAssignment = staff[0];
  const courseCapabilities = getCourseCapabilities({
    ...toCourseScope(course, input.userId),
    isCohortStaff: Boolean(exactStaffAssignment),
  });
  const capabilities = getCohortCapabilities({
    course: courseCapabilities,
    staffRole: exactStaffAssignment?.role,
  });
  const permission = input.permission ?? "view";
  const allowed = {
    view: capabilities.view,
    update: capabilities.update,
    delete: capabilities.delete,
    "staff.manage": capabilities.manageStaff,
    "learners.manage": capabilities.manageLearners,
    "invites.manage": capabilities.manageInvites,
    "meetings.manage": capabilities.manageMeetings,
    "assessment.review": capabilities.reviewAssessments,
  }[permission];

  if (!allowed) return forbidden();
  return { ...cohort, access: capabilities };
}

export function requireCourseItemAccess(input: {
  courseItemId: string;
  userId: string;
}) {
  return memoizeForRequest(
    `courseItemAccess:${input.courseItemId}:${input.userId}`,
    () => loadCourseItemAccess(input),
  );
}

async function loadCourseItemAccess(input: {
  courseItemId: string;
  userId: string;
}) {
  const now = new Date();
  const item = await db.courseItem.findUnique({
    where: { id: input.courseItemId },
    select: {
      id: true,
      isPublished: true,
      module: {
        select: {
          course: {
            select: {
              id: true,
              status: true,
              progressionMode: true,
              owner: { select: { userId: true } },
              collaborators: {
                where: {
                  role: "EDITOR",
                  organizationMember: { userId: input.userId },
                },
                select: { id: true },
                take: 1,
              },
              organization: {
                select: {
                  permissionMode: true,
                  members: {
                    where: { userId: input.userId },
                    select: { role: true },
                    take: 1,
                  },
                },
              },
              cohorts: {
                where: {
                  staff: {
                    some: { organizationMember: { userId: input.userId } },
                  },
                },
                select: { id: true },
                take: 1,
              },
              enrollments: {
                where: {
                  userId: input.userId,
                  status: { in: [...activeEnrollmentStatuses] },
                  source: { not: "COHORT" },
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
                select: { id: true },
                take: 1,
              },
              // Active cohort enrollment, folded in as a filtered count
              // because `cohorts` is already selected for staff scope.
              _count: {
                select: {
                  cohorts: {
                    where: {
                      status: { in: [...accessGrantingCohortStatuses] },
                      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
                      enrollments: {
                        some: {
                          userId: input.userId,
                          status: { in: [...activeEnrollmentStatuses] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!item) throw new TRPCError({ code: "NOT_FOUND" });

  const course = item.module.course;
  const scope = {
    organizationRole: course.organization.members[0]?.role,
    permissionMode: course.organization.permissionMode,
    isCourseOwner: course.owner.userId === input.userId,
    isCourseEditor: course.collaborators.length > 0,
    isCohortStaff: course.cohorts.length > 0,
  };
  const allowed = canAccessLearningContent({
    ...scope,
    hasActiveEnrollment:
      course.enrollments.length > 0 || course._count.cohorts > 0,
    isCoursePublished: course.status === "PUBLISHED",
    isItemPublished: item.isPublished,
  });

  if (!allowed) return forbidden();

  // Only sequential courses can lock modules: open courses never report
  // LOCKED, and cohort staff get management access to the whole outline, so
  // the outline is skipped for both. Learners reaching this point already have
  // an active enrollment in the published course and a published item.
  if (
    course.progressionMode === "SEQUENTIAL" &&
    !canManageContent(scope) &&
    !scope.isCohortStaff
  ) {
    const outline = await getCourseOutlineForUser(course.id, input.userId);
    const outlineModule = outline.modules.find((candidate) =>
      candidate.items.some((candidateItem) => candidateItem.id === item.id),
    );
    if (!outlineModule || outlineModule.access === "LOCKED") return forbidden();
  }

  return item;
}
