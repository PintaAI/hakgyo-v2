import type {
  OrganizationPermissionMode,
  OrganizationRole,
} from "../../../generated/prisma/enums";

export function getOrganizationCohortScope(input: {
  membershipId: string;
  permissionMode: OrganizationPermissionMode;
  role: OrganizationRole;
}) {
  if (input.role !== "TEACHER") return {};

  const assigned = {
    staff: { some: { organizationMemberId: input.membershipId } },
  };
  if (input.permissionMode === "SIMPLE") return assigned;

  return {
    OR: [{ course: { ownerMembershipId: input.membershipId } }, assigned],
  };
}
