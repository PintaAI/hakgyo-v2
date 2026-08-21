import { ReviewQueue } from "~/components/review-queue";
import { organizationRoles } from "~/lib/access";
import { requireOrganizationRole } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const membership = await requireOrganizationRole(
    organizationSlug,
    organizationRoles,
  );
  const organizationId = membership.organizationId;
  void api.assessment.listAttemptsNeedingReview.prefetchInfinite({
    organizationId,
    includeTotal: true,
  });

  return (
    <HydrateClient>
      <ReviewQueue organizationId={organizationId} />
    </HydrateClient>
  );
}
