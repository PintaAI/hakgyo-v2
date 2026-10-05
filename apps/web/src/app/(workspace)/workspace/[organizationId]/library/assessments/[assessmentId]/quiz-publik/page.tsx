import { PublicQuizManager } from "~/components/public-quiz/public-quiz-manager";
import { env } from "~/env";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string; assessmentId: string }>;
}) {
  const { organizationId: organizationSlug, assessmentId } = await params;
  await requireOrganizationMembershipBySlug(organizationSlug);
  await api.publicQuiz.getForAssessment.prefetch({ assessmentId });

  return (
    <HydrateClient>
      <PublicQuizManager
        assessmentId={assessmentId}
        organizationSlug={organizationSlug}
        appUrl={env.APP_URL}
      />
    </HydrateClient>
  );
}
