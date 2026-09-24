import type { RouterOutputs } from "@hakgyo/api";

type ActiveBrandContext = RouterOutputs["brand"]["getContext"];
type AvailableOrganizationBrand =
  RouterOutputs["brand"]["listAvailableContexts"][number];

export function resolveActiveBrand({
  availableOrganizations,
  defaultBrand,
  routeBrand,
  selectedOrganizationId,
}: {
  availableOrganizations: AvailableOrganizationBrand[];
  defaultBrand: ActiveBrandContext;
  routeBrand: ActiveBrandContext | undefined;
  selectedOrganizationId: string | null;
}): ActiveBrandContext {
  const selectedBrand =
    availableOrganizations.find(
      ({ organizationId }) => organizationId === selectedOrganizationId,
    ) ?? defaultBrand;

  if (!routeBrand?.organizationId) return selectedBrand;

  // The route query identifies the organization, but its cached branding may
  // predate a refresh of the organization list.
  return (
    availableOrganizations.find(
      ({ organizationId }) => organizationId === routeBrand.organizationId,
    ) ?? routeBrand
  );
}
