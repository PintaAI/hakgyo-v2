import { WorkspacePagePlaceholder } from "~/components/placeholder/workspace-page-placeholder";
import { organizationManagerRoles } from "~/lib/access";
import { requireOrganizationRole } from "~/server/auth/dal";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  await requireOrganizationRole(organizationId, organizationManagerRoles);
  return (
    <WorkspacePagePlaceholder title="Organization members" params={params} />
  );
}
