import { TRPCError } from "@trpc/server";

import { EnrollmentStatus } from "../../../generated/prisma/enums";
import { db } from "~/server/db";
import { getCourseOutlineForUser } from "~/server/learning/course-outline";
import {
  canAccessLearningContent,
  canManageContent,
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

export async function requireOrganizationMembership(input: {
  organizationId: string;
  userId: string;
}) {
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
    select: {
      id: true,
      organizationId: true,
      role: true,
      userId: true,
      organization: {
        select: { permissionMode: true, teacherCanCreateCourse: true },
      },
    },
  });

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
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
    select: {
      id: true,
      organizationId: true,
      role: true,
      userId: true,
      organization: { select: { permissionMode: true } },
    },
  });

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

async function getCourseScope(courseId: string, userId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
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
    },
  });

  if (!course) throw new TRPCError({ code: "NOT_FOUND" });

  return {
    course,
    scope: {
      organizationRole: course.organization.members[0]?.role,
      permissionMode: course.organization.permissionMode,
      isCourseOwner: course.owner.userId === userId,
      isCourseEditor: course.collaborators.length > 0,
      isCohortStaff: course.cohorts.length > 0,
    },
  };
}

export async function requireCoursePermission(input: {
  courseId: string;
  permission: "course.view" | "course.manage" | "content.manage";
  userId: string;
}) {
  const result = await getCourseScope(input.courseId, input.userId);
  const capabilities = getCourseCapabilities(result.scope);
  const allowed =
    input.permission === "course.view"
      ? capabilities.view
      : input.permission === "course.manage"
        ? capabilities.manage
        : capabilities.manageContent;

  if (!allowed) return forbidden();
  return {
    ...result.course,
    access: {
      canManageCourse: capabilities.manage,
      canManageContent: capabilities.manageContent,
      canViewCohorts: capabilities.viewCohorts,
      canViewAllCohorts: capabilities.viewAllCohorts,
      canCreateCohort: capabilities.createCohort,
      canManageCohortInvites: capabilities.manageCohortInvites,
      usesAdvancedPermissions: capabilities.usesAdvancedPermissions,
    },
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
  const cohort = await db.cohort.findUnique({
    where: { id: input.cohortId },
    select: { courseId: true },
  });
  if (!cohort) throw new TRPCError({ code: "NOT_FOUND" });

  const [result, exactStaffAssignment] = await Promise.all([
    getCourseScope(cohort.courseId, input.userId),
    db.cohortStaff.findFirst({
      where: {
        cohortId: input.cohortId,
        organizationMember: { userId: input.userId },
      },
      select: { id: true, role: true },
    }),
  ]);
  const courseCapabilities = getCourseCapabilities({
    ...result.scope,
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

export async function requireCourseItemAccess(input: {
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
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!item) throw new TRPCError({ code: "NOT_FOUND" });

  const course = item.module.course;
  const cohortEnrollment = await db.cohortEnrollment.findFirst({
    where: {
      userId: input.userId,
      status: { in: [...activeEnrollmentStatuses] },
      cohort: { courseId: course.id },
    },
    select: { id: true },
  });
  const allowed = canAccessLearningContent({
    organizationRole: course.organization.members[0]?.role,
    permissionMode: course.organization.permissionMode,
    isCourseOwner: course.owner.userId === input.userId,
    isCourseEditor: course.collaborators.length > 0,
    isCohortStaff: course.cohorts.length > 0,
    hasActiveEnrollment:
      course.enrollments.length > 0 || Boolean(cohortEnrollment),
    isCoursePublished: course.status === "PUBLISHED",
    isItemPublished: item.isPublished,
  });

  if (!allowed) return forbidden();

  if (
    !canManageContent({
      organizationRole: course.organization.members[0]?.role,
      permissionMode: course.organization.permissionMode,
      isCourseOwner: course.owner.userId === input.userId,
      isCourseEditor: course.collaborators.length > 0,
      isCohortStaff: course.cohorts.length > 0,
    })
  ) {
    const outline = await getCourseOutlineForUser(course.id, input.userId);
    const courseModule = outline.modules.find((candidate) =>
      candidate.items.some((candidateItem) => candidateItem.id === item.id),
    );
    if (!courseModule || courseModule.access === "LOCKED") return forbidden();
  }

  return item;
}
