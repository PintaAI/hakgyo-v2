import { WorkspacePagePlaceholder } from "~/components/placeholder/workspace-page-placeholder";
import { organizationManagerRoles } from "~/lib/access";
import { requireOrganizationRole } from "~/server/auth/dal";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  await requireOrganizationRole(organizationSlug, organizationManagerRoles);
  return <WorkspacePagePlaceholder title="Antrean review" params={params} />;
}
