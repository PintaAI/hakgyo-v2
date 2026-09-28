import { VocabularyEditor } from "~/components/vocabulary-editor";

import { requireCurriculumModule } from "../../curriculum-module";

export default async function Page({
  params,
}: {
  params: Promise<{
    organizationId: string;
    courseId: string;
    moduleId: string;
  }>;
}) {
  const { organizationId, organizationSlug, attachTo, moduleHref } =
    await requireCurriculumModule(await params);

  return (
    <VocabularyEditor
      attachTo={{ ...attachTo, editorBaseHref: `${moduleHref}/vocabulary` }}
      organizationId={organizationId}
      organizationSlug={organizationSlug}
    />
  );
}
