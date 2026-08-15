import { OrganizationMembers } from "~/components/organization-members";
import { organizationManagerRoles } from "~/lib/access";
import { requireOrganizationRole } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const membership = await requireOrganizationRole(
    organizationSlug,
    organizationManagerRoles,
  );
  const organizationId = membership.organizationId;
  void api.organization.listMembers.prefetch({ organizationId });

  return (
    <HydrateClient>
      <OrganizationMembers
        organizationId={organizationId}
        currentMembershipId={membership.id}
        currentRole={membership.role}
      />
    </HydrateClient>
  );
}
