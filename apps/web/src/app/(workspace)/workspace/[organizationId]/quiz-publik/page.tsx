import { PublicQuizOverview } from "~/components/public-quiz/public-quiz-overview";
import { env } from "~/env";
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
  void api.publicQuiz.listForOrganization.prefetch({
    organizationId: membership.organizationId,
  });

  return (
    <HydrateClient>
      <PublicQuizOverview
        organizationId={membership.organizationId}
        organizationSlug={organizationSlug}
        appUrl={env.APP_URL}
      />
    </HydrateClient>
  );
}
