import { TRPCError } from "@trpc/server";

import { EnrollmentStatus } from "../../../generated/prisma/enums";
import { db } from "~/server/db";
import { getCourseOutlineForUser } from "~/server/learning/course-outline";
import {
  canAccessLearningContent,
  canManageCohort,
  canManageContent,
  canManageCourse,
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

export async function requireOrganizationPermission(input: {
  organizationId: string;
  permission: Permission;
  userId: string;
}) {
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
    select: { id: true, organizationId: true, role: true, userId: true },
  });

  if (!membership || !hasPermission(membership.role, input.permission)) {
    return forbidden();
  }

  return membership;
}

export async function requireContentAuthor(input: {
  organizationId: string;
  userId: string;
  createdByMembershipId?: string;
}) {
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
    select: { id: true, organizationId: true, role: true, userId: true },
  });

  if (
    !membership ||
    (membership.role === "TEACHER" &&
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
      owner: { select: { userId: true } },
      organization: {
        select: {
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
      isCourseOwner: course.owner.userId === userId,
      isCohortStaff: course.cohorts.length > 0,
    },
  };
}

export async function requireCoursePermission(input: {
  courseId: string;
  permission: "course.manage" | "content.manage";
  userId: string;
}) {
  const result = await getCourseScope(input.courseId, input.userId);
  const allowed =
    input.permission === "course.manage"
      ? canManageCourse(result.scope)
      : canManageContent(result.scope);

  if (!allowed) return forbidden();
  return result.course;
}

export async function requireCohortPermission(input: {
  cohortId: string;
  userId: string;
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
      select: { id: true },
    }),
  ]);
  if (
    !canManageCohort({
      ...result.scope,
      isCohortStaff: Boolean(exactStaffAssignment),
    })
  ) {
    return forbidden();
  }
  return cohort;
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
              organization: {
                select: {
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
    isCourseOwner: course.owner.userId === input.userId,
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
      isCourseOwner: course.owner.userId === input.userId,
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
