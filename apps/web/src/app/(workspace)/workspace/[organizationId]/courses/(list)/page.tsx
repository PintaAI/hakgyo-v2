import { CoursesLibrary } from "~/components/courses-library";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api } from "~/trpc/server";

export default async function CoursesPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  const courses = await api.course.list({
    organizationId: membership.organizationId,
  });

  return (
    <div className="w-full">
      <CoursesLibrary
        courses={courses}
        canCreate={
          membership.role === "OWNER" ||
          (membership.organization.permissionMode === "ADVANCED" &&
            membership.role === "ADMIN") ||
          (membership.organization.permissionMode === "SIMPLE" &&
            membership.role === "TEACHER")
        }
        organizationSlug={organizationSlug}
        role={membership.role}
      />
    </div>
  );
}
