import { AssessmentEditor } from "~/components/assessment-editor";
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
    <AssessmentEditor
      organizationId={membership.organizationId}
      organizationSlug={organizationSlug}
    />
  );
}
