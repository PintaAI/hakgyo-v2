import { notFound } from "next/navigation";

import { MaterialEditor } from "~/components/material-editor";
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

  return (
    <MaterialEditor
      attachTo={{
        moduleId: courseModule.id,
        moduleTitle: courseModule.title,
        curriculumHref,
      }}
      organizationId={membership.organizationId}
      organizationSlug={organizationSlug}
    />
  );
}
