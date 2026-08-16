import { Hanken_Grotesk, Inter } from "next/font/google";
import { notFound } from "next/navigation";

import { CohortWorkspace } from "~/components/cohort-workspace";
import { cn } from "~/lib/utils";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api } from "~/trpc/server";

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
}: {
  params: Promise<{
    organizationId: string;
    courseId: string;
    cohortId: string;
  }>;
}) {
  const { organizationId: organizationSlug, courseId, cohortId } = await params;
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

  return (
    <div
      className={cn(
        hanken.variable,
        inter.variable,
        "mx-auto w-full max-w-6xl font-[family-name:var(--font-inter)]",
      )}
    >
      <CohortWorkspace
        initialCohort={cohort}
        organizationSlug={organizationSlug}
      />
    </div>
  );
}
