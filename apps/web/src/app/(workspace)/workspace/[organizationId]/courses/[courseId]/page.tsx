import { Hanken_Grotesk, Inter } from "next/font/google";
import { notFound } from "next/navigation";

import { CourseWorkspace } from "~/components/course-workspace";
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

export default async function CoursePage({
  params,
}: {
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  const { organizationId: organizationSlug, courseId } = await params;
  const [membership, course] = await Promise.all([
    requireOrganizationMembershipBySlug(organizationSlug),
    api.course.get({ courseId }),
  ]);

  if (course.organizationId !== membership.organizationId) notFound();

  return (
    <div
      className={cn(
        hanken.variable,
        inter.variable,
        "mx-auto w-full max-w-6xl font-[family-name:var(--font-inter)]",
      )}
    >
      <CourseWorkspace
        course={course}
        organizationId={membership.organizationId}
        organizationSlug={organizationSlug}
      />
    </div>
  );
}
