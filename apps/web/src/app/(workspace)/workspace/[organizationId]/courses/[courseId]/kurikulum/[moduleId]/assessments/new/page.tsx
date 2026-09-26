import { notFound } from "next/navigation";

import { AssessmentEditor } from "~/components/assessment-editor";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{
    organizationId: string;
    courseId: string;
    moduleId: string;
  }>;
}) {
  const { organizationId: organizationSlug, courseId, moduleId } = await params;
  // Start the course lookup alongside the membership check; its errors are
  // surfaced only after the membership check so redirects keep precedence.
  const coursePromise = api.course.get({ courseId });
  coursePromise.catch(() => undefined);
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  const course = await coursePromise;
  const courseModule = course.modules.find((module) => module.id === moduleId);

  if (
    course.organizationId !== membership.organizationId ||
    !course.access.canManageContent ||
    !courseModule
  ) {
    notFound();
  }

  const curriculumHref = `/workspace/${organizationSlug}/courses/${courseId}/kurikulum`;

  return (
    <AssessmentEditor
      attachTo={{
        moduleId: courseModule.id,
        moduleTitle: courseModule.title,
        curriculumHref,
        editorBaseHref: `${curriculumHref}/${courseModule.id}/assessments`,
      }}
      organizationId={membership.organizationId}
      organizationSlug={organizationSlug}
    />
  );
}
