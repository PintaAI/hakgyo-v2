import { notFound } from "next/navigation";
import { OrganizationLandingEditor } from "~/components/organization-landing-editor";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export const metadata = {
  title: "Landing page",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: slug } = await params;
  const membership = await requireOrganizationMembershipBySlug(slug);
  if (membership.role !== "OWNER") notFound();
  await api.organizationLanding.get.prefetch({
    organizationId: membership.organizationId,
  });
  return (
    <HydrateClient>
      <OrganizationLandingEditor organizationId={membership.organizationId} />
    </HydrateClient>
  );
}
