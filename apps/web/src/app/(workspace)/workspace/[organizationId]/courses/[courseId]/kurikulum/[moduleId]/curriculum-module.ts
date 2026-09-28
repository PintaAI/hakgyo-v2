import { notFound } from "next/navigation";

import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api } from "~/trpc/server";

/**
 * Resolves the course module a curriculum editor page attaches content to,
 * returning 404 unless the member may manage the course's content.
 */
export async function requireCurriculumModule(params: {
  organizationId: string;
  courseId: string;
  moduleId: string;
}) {
  const { organizationId: organizationSlug, courseId, moduleId } = params;
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
  return {
    organizationId: membership.organizationId,
    organizationSlug,
    attachTo: {
      moduleId: courseModule.id,
      moduleTitle: courseModule.title,
      curriculumHref,
    },
    moduleHref: `${curriculumHref}/${courseModule.id}`,
  };
}
