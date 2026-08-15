import { VocabularyLibrary } from "~/components/vocabulary-library";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
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
  void api.content.listVocabularySets.prefetch({ organizationId });

  return (
    <HydrateClient>
      <VocabularyLibrary
        organizationId={organizationId}
        organizationSlug={organizationSlug}
      />
    </HydrateClient>
  );
}
