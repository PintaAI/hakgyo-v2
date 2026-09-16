export type OrganizationSwitcherOption = {
  organizationId: string | null;
  name: string;
  logoUrl: string | null;
  isThemed: boolean;
};

export function getOrganizationSwitcherOptions(
  activeOrganization: OrganizationSwitcherOption,
  availableOrganizations: readonly OrganizationSwitcherOption[],
): OrganizationSwitcherOption[] {
  if (activeOrganization.organizationId === null) {
    return availableOrganizations.length > 0
      ? [...availableOrganizations]
      : [activeOrganization];
  }

  return availableOrganizations.some(
    ({ organizationId }) =>
      organizationId === activeOrganization.organizationId,
  )
    ? [...availableOrganizations]
    : [activeOrganization, ...availableOrganizations];
}
