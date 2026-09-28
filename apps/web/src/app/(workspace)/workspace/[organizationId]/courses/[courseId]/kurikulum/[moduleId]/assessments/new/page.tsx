import { AssessmentEditor } from "~/components/assessment-editor";

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
    <AssessmentEditor
      attachTo={{ ...attachTo, editorBaseHref: `${moduleHref}/assessments` }}
      organizationId={organizationId}
      organizationSlug={organizationSlug}
    />
  );
}
