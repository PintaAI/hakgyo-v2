import { Hanken_Grotesk, Inter } from "next/font/google";
import { redirect } from "next/navigation";

import { CourseCreateForm } from "~/components/course-create-form";
import { cn } from "~/lib/utils";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default async function NewCoursePage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  if (
    membership.role === "ADMIN" &&
    membership.organization.permissionMode === "SIMPLE"
  ) {
    redirect(`/workspace/${organizationSlug}/courses`);
  }
  if (
    membership.role === "TEACHER" &&
    membership.organization.permissionMode === "ADVANCED" &&
    !membership.organization.teacherCanCreateCourse
  ) {
    redirect(`/workspace/${organizationSlug}/courses`);
  }

  return (
    <div
      className={cn(
        hanken.variable,
        inter.variable,
        "mx-auto w-full max-w-5xl font-[family-name:var(--font-inter)]",
      )}
    >
      <CourseCreateForm
        organizationId={membership.organizationId}
        organizationSlug={organizationSlug}
        ownerMembershipId={membership.id}
      />
    </div>
  );
}
