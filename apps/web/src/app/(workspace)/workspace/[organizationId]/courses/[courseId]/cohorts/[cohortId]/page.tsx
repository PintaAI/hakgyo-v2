import { Hanken_Grotesk, Inter } from "next/font/google";
import { notFound } from "next/navigation";

import { CohortWorkspace } from "~/components/cohort-workspace";
import { cn } from "~/lib/utils";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default async function CohortPage({
  params,
  searchParams,
}: {
  params: Promise<{
    organizationId: string;
    courseId: string;
    cohortId: string;
  }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { organizationId: organizationSlug, courseId, cohortId } = await params;
  const { view } = await searchParams;
  const [membership, cohort] = await Promise.all([
    requireOrganizationMembershipBySlug(organizationSlug),
    api.cohort.get({ cohortId }),
  ]);

  if (
    cohort.organizationId !== membership.organizationId ||
    cohort.courseId !== courseId
  ) {
    notFound();
  }

  // Prefetch the lists CohortWorkspace shows for the requested view (matching
  // its query inputs) so they arrive with the page instead of after hydration.
  const requestedView = typeof view === "string" ? view : undefined;
  const showsLearners =
    cohort.access.manageLearners &&
    (!requestedView ||
      ["overview", "learners", "invites"].includes(requestedView));
  const showsMeetings =
    !requestedView || ["overview", "meetings"].includes(requestedView);
  void Promise.all([
    showsLearners
      ? api.enrollment.listCohortEnrollments.prefetchInfinite({
          cohortId: cohort.id,
          includeTotal: true,
        })
      : undefined,
    showsMeetings
      ? api.cohort.listMeetings.prefetchInfinite({
          cohortId: cohort.id,
          includeTotal: true,
        })
      : undefined,
  ]);

  return (
    <div
      className={cn(
        hanken.variable,
        inter.variable,
        "w-full font-[family-name:var(--font-inter)]",
      )}
    >
      <HydrateClient>
        <CohortWorkspace
          initialCohort={cohort}
          organizationSlug={organizationSlug}
        />
      </HydrateClient>
    </div>
  );
}
