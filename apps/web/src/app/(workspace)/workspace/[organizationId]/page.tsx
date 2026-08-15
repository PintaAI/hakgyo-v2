import { redirect } from "next/navigation";

import { getWorkspaceFallback } from "~/lib/access";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  redirect(getWorkspaceFallback(organizationSlug, membership.role));
}
