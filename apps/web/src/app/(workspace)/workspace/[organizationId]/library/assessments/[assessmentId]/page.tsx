import { AssessmentEditor } from "~/components/assessment-editor";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string; assessmentId: string }>;
}) {
  const { organizationId: organizationSlug, assessmentId } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  const organizationId = membership.organizationId;
  void api.assessment.get.prefetch({ assessmentId });

  return (
    <HydrateClient>
      <AssessmentEditor
        assessmentId={assessmentId}
        organizationId={organizationId}
        organizationSlug={organizationSlug}
      />
    </HydrateClient>
  );
}
