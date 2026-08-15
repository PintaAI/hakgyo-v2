import { VocabularyEditor } from "~/components/vocabulary-editor";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string; vocabularySetId: string }>;
}) {
  const { organizationId: organizationSlug, vocabularySetId } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  const organizationId = membership.organizationId;
  void api.content.listVocabularySets.prefetch({ organizationId });

  return (
    <HydrateClient>
      <VocabularyEditor
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        vocabularySetId={vocabularySetId}
      />
    </HydrateClient>
  );
}
