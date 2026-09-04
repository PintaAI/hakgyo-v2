import type { Metadata } from "next";

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
  return <LearnerAssessmentEvent event={event} />;
}
