import { AssessmentEditor } from "~/components/assessment-editor";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string; assessmentId: string }>;
  searchParams: Promise<{ pickerToken?: string; returnTo?: string }>;
}) {
  const { organizationId: organizationSlug, assessmentId } = await params;
  const { pickerToken, returnTo } = await searchParams;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  void api.assessment.get.prefetch({ assessmentId });

  return (
    <HydrateClient>
      <AssessmentEditor
        assessmentId={assessmentId}
        organizationId={membership.organizationId}
        organizationSlug={organizationSlug}
        pickerToken={pickerToken}
        returnTo={returnTo}
      />
    </HydrateClient>
  );
}
