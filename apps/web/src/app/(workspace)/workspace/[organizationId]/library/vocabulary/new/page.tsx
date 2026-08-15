import { VocabularyEditor } from "~/components/vocabulary-editor";
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
    <VocabularyEditor
      organizationId={membership.organizationId}
      organizationSlug={organizationSlug}
    />
  );
}
