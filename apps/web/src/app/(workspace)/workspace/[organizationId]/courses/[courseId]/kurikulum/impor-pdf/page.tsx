import { Hanken_Grotesk, Inter } from "next/font/google";
import { notFound } from "next/navigation";

import { PdfImportFlow } from "~/components/pdf-book/pdf-import-flow";
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

export default async function PdfImportPage({
  params,
}: {
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  const { organizationId: organizationSlug, courseId } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  const course = await api.course.get({ courseId });

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
        "w-full font-[family-name:var(--font-inter)]",
      )}
    >
      <PdfImportFlow
        courseId={course.id}
        curriculumHref={`/workspace/${organizationSlug}/courses/${course.id}/kurikulum`}
        existingModules={course.modules.map(({ id, title }) => ({ id, title }))}
        organizationId={membership.organizationId}
      />
    </div>
  );
}
