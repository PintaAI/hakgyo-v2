import { VocabularyEditor } from "~/components/vocabulary-editor";
import { HydrateClient, api } from "~/trpc/server";

import { requireCurriculumModule } from "../../curriculum-module";

export default async function Page({
  params,
}: {
  params: Promise<{
    organizationId: string;
    courseId: string;
    moduleId: string;
    vocabularySetId: string;
  }>;
}) {
  const resolvedParams = await params;
  const { organizationId, organizationSlug, attachTo, moduleHref } =
    await requireCurriculumModule(resolvedParams);
  const { vocabularySetId } = resolvedParams;
  void api.content.getVocabularySet.prefetch({
    organizationId,
    vocabularySetId,
  });

  return (
    <HydrateClient>
      <VocabularyEditor
        attachTo={{ ...attachTo, editorBaseHref: `${moduleHref}/vocabulary` }}
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        vocabularySetId={vocabularySetId}
      />
    </HydrateClient>
  );
}
