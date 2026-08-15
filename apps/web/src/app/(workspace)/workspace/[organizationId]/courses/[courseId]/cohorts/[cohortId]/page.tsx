import { redirect } from "next/navigation";

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
  redirect(
    `/workspace/${organizationSlug}/courses/${courseId}/cohorts/${cohortId}/overview`,
  );
}
