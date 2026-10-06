import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OrganizationFirstCourse } from "~/components/organization-first-course";
import { getWorkspaceFallback } from "~/lib/access";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { canCreateCourse } from "~/server/authorization";

export const metadata: Metadata = {
  title: "Kurikulum pertama",
  robots: { index: false, follow: false },
};

export default async function FirstCoursePage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  if (!canCreateCourse(membership)) {
    redirect(getWorkspaceFallback(organizationSlug, membership.role));
  }
  return (
    <OrganizationFirstCourse
      organizationId={membership.organizationId}
      organizationName={membership.organization.name}
      organizationSlug={membership.organization.slug}
      ownerMembershipId={membership.id}
    />
  );
}
