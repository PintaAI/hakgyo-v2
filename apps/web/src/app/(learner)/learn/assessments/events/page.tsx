import type { Metadata } from "next";

import { LearnerAssessmentEvents } from "~/components/learner-assessment-events";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Semua event tugas" };

export default async function AssessmentEventsPage() {
  const events = await api.assessmentEvent.listForLearner();
  return <LearnerAssessmentEvents events={events} />;
}
