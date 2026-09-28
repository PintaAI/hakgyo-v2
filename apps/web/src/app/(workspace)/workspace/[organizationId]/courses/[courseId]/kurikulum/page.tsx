import { notFound } from "next/navigation";

import { KurikulumEditor } from "~/components/kurikulum-editor";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export default async function KurikulumPage({
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
  const [course, materials, assessments, vocabularySets] = await Promise.all([
    coursePromise,
    api.content.listMaterials({ organizationId: membership.organizationId }),
    api.assessment.list({ organizationId: membership.organizationId }),
    api.content.listVocabularySets({
      organizationId: membership.organizationId,
    }),
  ]);

  if (
    course.organizationId !== membership.organizationId ||
    !course.access.canManageContent
  ) {
    notFound();
  }
  void api.content.listCoursePdfPageRanges.prefetch({ courseId });
  void api.content.getCurriculumReadiness.prefetch({ courseId });
  const toOption = ({ id, title }: { id: string; title: string }) => ({
    id,
    title,
  });

  return (
    <div className="w-full">
      <HydrateClient>
        <KurikulumEditor
          assessments={assessments.map((assessment) => ({
            ...toOption(assessment),
            description: assessment.description,
            questionCount: assessment._count.questions,
            timeLimitMinutes: assessment.timeLimitMinutes,
            updatedAt: assessment.updatedAt,
          }))}
          initialCourse={course}
          materials={materials.map(toOption)}
          organizationSlug={organizationSlug}
          vocabularySets={vocabularySets.map(toOption)}
        />
      </HydrateClient>
    </div>
  );
}
