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
  // Must match the client's initial query input exactly (see ReviewQueue) to
  // hydrate. Awaited so the server HTML matches the browser's first render.
  await Promise.all([
    api.assessment.listAttempts.prefetch({
      organizationId,
      status: "IN_REVIEW",
      page: 1,
      limit: 20,
    }),
    api.assessment.getRegisterFilters.prefetch({ organizationId }),
  ]);

  return (
    <HydrateClient>
      <ReviewQueue organizationId={organizationId} />
    </HydrateClient>
  );
}
