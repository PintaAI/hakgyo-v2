import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LearnerAssessmentEvent } from "~/components/learner-assessment-events";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Assessment event" };

export default async function AssessmentEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await api.assessmentEvent.getForLearner({ eventId });
  const attempt = event.attempts[0];

  if (event.entry.destination === "ATTEMPT" && attempt) {
    redirect(
      `/learn/${event.course.id}/items/${event.courseItem.id}/attempts/${attempt.id}`,
    );
  }

  return <LearnerAssessmentEvent event={event} />;
}
