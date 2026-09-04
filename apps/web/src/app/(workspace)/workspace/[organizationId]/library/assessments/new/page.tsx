import { AssessmentEditor } from "~/components/assessment-editor";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ pickerToken?: string; returnTo?: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const { pickerToken, returnTo } = await searchParams;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);

  return (
    <AssessmentEditor
      organizationId={membership.organizationId}
      organizationSlug={organizationSlug}
      pickerToken={pickerToken}
      returnTo={returnTo}
    />
  );
}
