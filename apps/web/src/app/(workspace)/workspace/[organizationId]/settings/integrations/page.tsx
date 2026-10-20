import { OrganizationIntegrations } from "~/components/organization-integrations";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  const organizationId = membership.organizationId;
  await Promise.all([
    api.organization.getZoomConnectionStatus.prefetch({ organizationId }),
    api.whatsapp.getConnection.prefetch({ organizationId }),
  ]);

  return (
    <HydrateClient>
      <OrganizationIntegrations organizationId={organizationId} />
    </HydrateClient>
  );
}
