import { MaterialEditor } from "~/components/material-editor";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string; materialId: string }>;
}) {
  const { organizationId: organizationSlug, materialId } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  const organizationId = membership.organizationId;
  void api.content.getMaterial.prefetch({ organizationId, materialId });

  return (
    <HydrateClient>
      <MaterialEditor
        materialId={materialId}
        organizationId={organizationId}
        organizationSlug={organizationSlug}
      />
    </HydrateClient>
  );
}
