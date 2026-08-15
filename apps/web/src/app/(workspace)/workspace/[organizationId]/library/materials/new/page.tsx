import { MaterialEditor } from "~/components/material-editor";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);

  return (
    <MaterialEditor
      organizationId={membership.organizationId}
      organizationSlug={organizationSlug}
    />
  );
}
