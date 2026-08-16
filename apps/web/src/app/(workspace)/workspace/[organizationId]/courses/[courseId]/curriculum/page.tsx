import { Hanken_Grotesk, Inter } from "next/font/google";
import { notFound } from "next/navigation";

import { CurriculumEditor } from "~/components/curriculum-editor";
import { cn } from "~/lib/utils";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api } from "~/trpc/server";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default async function CurriculumPage({
  params,
}: {
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  const { organizationId: organizationSlug, courseId } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  const [course, materials, assessments, vocabularySets] = await Promise.all([
    api.course.get({ courseId }),
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

  return (
    <div
      className={cn(
        hanken.variable,
        inter.variable,
        "mx-auto w-full max-w-6xl font-[family-name:var(--font-inter)]",
      )}
    >
      <CurriculumEditor
        assessments={assessments}
        course={course}
        materials={materials}
        organizationId={membership.organizationId}
        organizationSlug={organizationSlug}
        vocabularySets={vocabularySets}
      />
    </div>
  );
}
