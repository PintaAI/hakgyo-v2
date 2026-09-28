import { MaterialEditor } from "~/components/material-editor";

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
  const { organizationId, organizationSlug, attachTo } =
    await requireCurriculumModule(await params);

  return (
    <MaterialEditor
      attachTo={attachTo}
      organizationId={organizationId}
      organizationSlug={organizationSlug}
    />
  );
}
