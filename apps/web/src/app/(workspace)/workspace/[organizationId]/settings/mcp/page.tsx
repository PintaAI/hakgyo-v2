import { McpServerSettings } from "~/components/mcp-server-settings";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { mcpResource } from "~/server/mcp/config";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  await requireOrganizationMembershipBySlug(organizationSlug);
  void api.account.listMcpAuthorizations.prefetch();

  return (
    <HydrateClient>
      <McpServerSettings endpoint={mcpResource} />
    </HydrateClient>
  );
}
