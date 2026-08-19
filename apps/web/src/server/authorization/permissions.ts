import type {
  CohortStaffRole,
  OrganizationPermissionMode,
  OrganizationRole,
} from "../../../generated/prisma/enums";

export const permissions = [
  "organization.manage",
  "organization.members.manage",
  "asset.create",
  "course.create",
  "assessment.review",
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions = {
  OWNER: permissions,
  ADMIN: permissions,
  TEACHER: ["asset.create", "course.create", "assessment.review"] as const,
} satisfies Record<OrganizationRole, readonly Permission[]>;

export function hasPermission(role: OrganizationRole, permission: Permission) {
  return (rolePermissions[role] as readonly Permission[]).includes(permission);
}

export type CourseScope = {
  organizationRole?: OrganizationRole;
  permissionMode?: OrganizationPermissionMode;
  isCourseOwner: boolean;
  isCourseEditor: boolean;
  isCohortStaff: boolean;
};

export function getCourseCapabilities(scope: CourseScope) {
  const organizationManager =
    scope.organizationRole === "OWNER" || scope.organizationRole === "ADMIN";
  const organizationOwner = scope.organizationRole === "OWNER";
  const simpleAdmin =
    scope.permissionMode === "SIMPLE" && scope.organizationRole === "ADMIN";
  const organizationMember = Boolean(scope.organizationRole);
  const simplified = scope.permissionMode === "SIMPLE";
  const manage =
    organizationOwner ||
    (!simplified && organizationManager) ||
    (simplified && scope.organizationRole === "TEACHER") ||
    (!simplified && scope.isCourseOwner);

  return {
    view:
      (simplified && organizationMember) ||
      manage ||
      scope.isCourseEditor ||
      scope.isCohortStaff,
    manage,
    manageContent: manage || (!simplified && scope.isCourseEditor),
    viewCohorts:
      organizationManager ||
      scope.isCohortStaff ||
      (!simplified && scope.isCourseOwner),
    viewAllCohorts: organizationManager || (!simplified && scope.isCourseOwner),
    manageAllCohorts:
      organizationOwner ||
      (!simplified && (organizationManager || scope.isCourseOwner)),
    manageCohortInvites:
      organizationOwner ||
      (!simplified && (organizationManager || scope.isCourseOwner)) ||
      simpleAdmin,
    createCohort:
      (simplified &&
        (organizationOwner || scope.organizationRole === "TEACHER")) ||
      (!simplified && (organizationManager || scope.isCourseOwner)),
    usesAdvancedPermissions: !simplified,
  };
}

export function getCohortCapabilities(input: {
  course: ReturnType<typeof getCourseCapabilities>;
  staffRole?: CohortStaffRole;
}) {
  const manager = input.course.manageAllCohorts;
  const inviteManager = input.course.manageCohortInvites;
  const instructor = input.staffRole === "INSTRUCTOR";
  const assistant = input.staffRole === "ASSISTANT";
  const assigned = instructor || assistant;
  const simplified = !input.course.usesAdvancedPermissions;

  return {
    view: manager || input.course.viewAllCohorts || assigned,
    update: manager || (simplified ? assigned : instructor),
    delete: manager || (simplified && assigned),
    manageStaff: manager,
    manageLearners: manager || assigned,
    manageInvites:
      manager || inviteManager || (simplified ? assigned : instructor),
    manageMeetings: manager || (simplified ? assigned : instructor),
    reviewAssessments: manager || (simplified ? assigned : instructor),
  };
}

export function canViewCourse(scope: CourseScope) {
  return getCourseCapabilities(scope).view;
}

export function canManageCourse(scope: CourseScope) {
  return getCourseCapabilities(scope).manage;
}

export function canManageContent(scope: CourseScope) {
  return getCourseCapabilities(scope).manageContent;
}

export function canAccessLearningContent(
  input: CourseScope & {
    hasActiveEnrollment: boolean;
    isCoursePublished: boolean;
    isItemPublished: boolean;
  },
) {
  if (canManageContent(input) || input.isCohortStaff) return true;

  return (
    input.hasActiveEnrollment &&
    input.isCoursePublished &&
    input.isItemPublished
  );
}
