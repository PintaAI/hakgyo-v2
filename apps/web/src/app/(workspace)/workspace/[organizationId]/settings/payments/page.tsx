import { OrganizationPaymentSettings } from "~/components/organization-payment-settings";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  const organizationId = membership.organizationId;
  void api.payment.getSettings.prefetch({ organizationId });

  return (
    <HydrateClient>
      <OrganizationPaymentSettings organizationId={organizationId} />
    </HydrateClient>
  );
}
