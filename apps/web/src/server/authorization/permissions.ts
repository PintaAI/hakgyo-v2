import type { OrganizationRole } from "../../../generated/prisma/enums";

export const permissions = [
  "organization.manage",
  "organization.members.manage",
  "asset.create",
  "course.create",
  "course.manage",
  "cohort.manage",
  "content.manage",
  "assessment.review",
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions = {
  OWNER: permissions,
  ADMIN: permissions,
  TEACHER: ["asset.create", "course.create"] as const,
} satisfies Record<OrganizationRole, readonly Permission[]>;

export function hasPermission(
  role: OrganizationRole,
  permission: Permission,
) {
  return (rolePermissions[role] as readonly Permission[]).includes(permission);
}

type CourseScope = {
  organizationRole?: OrganizationRole;
  isCourseOwner: boolean;
  isCohortStaff: boolean;
};

export function canManageCourse(scope: CourseScope) {
  if (
    scope.organizationRole &&
    hasPermission(scope.organizationRole, "course.manage")
  ) {
    return true;
  }

  return scope.isCourseOwner;
}

export function canManageCohort(scope: CourseScope) {
  if (
    scope.organizationRole &&
    hasPermission(scope.organizationRole, "cohort.manage")
  ) {
    return true;
  }

  return scope.isCourseOwner || scope.isCohortStaff;
}

export function canManageContent(scope: CourseScope) {
  if (
    scope.organizationRole &&
    hasPermission(scope.organizationRole, "content.manage")
  ) {
    return true;
  }

  return scope.isCourseOwner;
}

export function canAccessLearningContent(input: CourseScope & {
  hasActiveEnrollment: boolean;
  isCoursePublished: boolean;
  isItemPublished: boolean;
}) {
  if (canManageContent(input) || input.isCohortStaff) return true;

  return (
    input.hasActiveEnrollment &&
    input.isCoursePublished &&
    input.isItemPublished
  );
}
