import { redirect } from "next/navigation";

import { getWorkspaceFallback } from "~/lib/access";
import { requireOrganizationMembership } from "~/server/auth/dal";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const membership = await requireOrganizationMembership(organizationId);
  redirect(getWorkspaceFallback(organizationId, membership.role));
}
