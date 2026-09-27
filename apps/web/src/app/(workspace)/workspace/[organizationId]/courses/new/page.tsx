import { redirect } from "next/navigation";

import { CourseCreateForm } from "~/components/course-create-form";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";

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
    <div className="w-full">
      <CourseCreateForm
        organizationId={membership.organizationId}
        organizationSlug={organizationSlug}
        ownerMembershipId={membership.id}
      />
    </div>
  );
}
