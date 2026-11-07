import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AssessmentEvent } from "~/components/learner/assessment/assessment-event";
import { assessmentEventAttemptHref } from "~/lib/learner/hrefs";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = { title: "Event tugas" };

export default async function AssessmentEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await api.assessmentEvent.getForLearner({ eventId });
  const attempt = event.attempts[0];

  if (event.entry.destination === "ATTEMPT" && attempt) {
    redirect(assessmentEventAttemptHref(event, attempt.id));
  }

  // A finished attempt shows in full under the result, as the app does: ship
  // its detail with the page instead of requesting it after hydration.
  if (attempt?.status === "GRADED" && attempt.score !== null) {
    await Promise.all([
      // Attempts of library events have no course item.
      event.courseItem
        ? api.assessment.getForCourseItem.prefetch({
            courseItemId: event.courseItem.id,
            attemptId: attempt.id,
          })
        : api.assessment.getForAttempt.prefetch({ attemptId: attempt.id }),
      api.assessment.getMyAttempt.prefetch({ attemptId: attempt.id }),
    ]);
  }

  return (
    <HydrateClient>
      <AssessmentEvent event={event} />
    </HydrateClient>
  );
}
