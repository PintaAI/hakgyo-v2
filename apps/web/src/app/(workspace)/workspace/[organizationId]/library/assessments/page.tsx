import { AssessmentLibrary } from "~/components/assessment-library";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { hasPermission } from "~/server/authorization/permissions";
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
  await api.assessment.list.prefetch({ organizationId });

  return (
    <HydrateClient>
      <AssessmentLibrary
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        canGenerateEpsSet={hasPermission(
          membership.role,
          "organization.manage",
        )}
      />
    </HydrateClient>
  );
}
