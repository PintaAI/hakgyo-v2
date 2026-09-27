import { notFound } from "next/navigation";

import { PdfImportFlow } from "~/components/pdf-book/pdf-import-flow";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api } from "~/trpc/server";

export default async function PdfImportPage({
  params,
}: {
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  const { organizationId: organizationSlug, courseId } = await params;
  // Start the course lookup alongside the membership check; its errors are
  // surfaced only after the membership check so redirects keep precedence.
  const coursePromise = api.course.get({ courseId });
  coursePromise.catch(() => undefined);
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  const course = await coursePromise;

  if (
    course.organizationId !== membership.organizationId ||
    !course.access.canManageContent
  ) {
    notFound();
  }

  return (
    <div className="w-full">
      <PdfImportFlow
        courseId={course.id}
        curriculumHref={`/workspace/${organizationSlug}/courses/${course.id}/kurikulum`}
        existingModules={course.modules.map(({ id, title }) => ({ id, title }))}
        organizationId={membership.organizationId}
      />
    </div>
  );
}
