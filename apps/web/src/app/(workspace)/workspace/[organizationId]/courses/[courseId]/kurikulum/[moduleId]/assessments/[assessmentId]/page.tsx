import { AssessmentEditor } from "~/components/assessment-editor";
import { HydrateClient, api } from "~/trpc/server";

import { requireCurriculumModule } from "../../curriculum-module";

export default async function Page({
  params,
}: {
  params: Promise<{
    organizationId: string;
    courseId: string;
    moduleId: string;
    assessmentId: string;
  }>;
}) {
  const resolvedParams = await params;
  const { organizationId, organizationSlug, attachTo, moduleHref } =
    await requireCurriculumModule(resolvedParams);
  const { assessmentId } = resolvedParams;
  void api.assessment.get.prefetch({ assessmentId });

  return (
    <HydrateClient>
      <AssessmentEditor
        assessmentId={assessmentId}
        attachTo={{ ...attachTo, editorBaseHref: `${moduleHref}/assessments` }}
        organizationId={organizationId}
        organizationSlug={organizationSlug}
      />
    </HydrateClient>
  );
}
