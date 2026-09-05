import { notFound } from "next/navigation";

import { VocabularyEditor } from "~/components/vocabulary-editor";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { HydrateClient, api } from "~/trpc/server";

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
  const {
    organizationId: organizationSlug,
    courseId,
    moduleId,
    vocabularySetId,
  } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  const course = await api.course.get({ courseId });
  const courseModule = course.modules.find((module) => module.id === moduleId);

  if (
    course.organizationId !== membership.organizationId ||
    !course.access.canManageContent ||
    !courseModule
  ) {
    notFound();
  }

  const curriculumHref = `/workspace/${organizationSlug}/courses/${courseId}/kurikulum`;
  void api.content.listVocabularySets.prefetch({
    organizationId: membership.organizationId,
  });

  return (
    <HydrateClient>
      <VocabularyEditor
        attachTo={{
          moduleId: courseModule.id,
          moduleTitle: courseModule.title,
          curriculumHref,
          editorBaseHref: `${curriculumHref}/${courseModule.id}/vocabulary`,
        }}
        organizationId={membership.organizationId}
        organizationSlug={organizationSlug}
        vocabularySetId={vocabularySetId}
      />
    </HydrateClient>
  );
}
